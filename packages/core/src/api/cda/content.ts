import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { createHash } from 'crypto';
import { prisma } from '../../db.js';
import { parseFields, projectFields } from '../../utils/query-shaping.js';
import {
  getCachedResponse,
  setCachedResponse,
  buildCacheKey,
} from '../../content/cache.js';
import {
  parseFilters,
  parseSortDirectives,
  applyFilters,
  applySorting,
} from '../../content/advanced-query.js';
import { trackCacheHit, trackCacheMiss } from '../../cache/observability.js';
import { addCacheTag, buildSurrogateKeyTags } from '../../cache/tags.js';

import type { Request, Response } from 'express';

const router: IRouter = Router();

const CACHE_TTL = 60; // seconds

/**
 * Compute a weak ETag from a JSON-serialisable value.
 */
function computeEtag(value: unknown): string {
  const hash = createHash('md5').update(JSON.stringify(value)).digest('hex');
  return `W/"${hash}"`;
}

/**
 * Hash query parameters into a short, deterministic string for cache keys.
 */
function hashQuery(params: Record<string, unknown>): string {
  const sorted = JSON.stringify(params, Object.keys(params).sort());
  return createHash('md5').update(sorted).digest('hex').slice(0, 12);
}

// ── GET /content/:typeKey ────────────────────────────────────────────
router.get('/:typeKey', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const typeKey = req.params.typeKey as string;
  const slug = req.query.slug as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
  const fields = parseFields(req.query.fields as string | undefined);
  const sortParam = req.query.sort as string | undefined;

  // ── Redis cache check ──
  const qHash = hashQuery({ ...req.query, page, limit });
  const cacheKey = buildCacheKey(spaceId, typeKey, slug ?? 'list', qHash);

  const cached = await getCachedResponse(cacheKey);
  if (cached) {
    trackCacheHit().catch(() => {});
    const parsed = JSON.parse(cached) as { etag: string; body: unknown };
    const etag = parsed.etag;

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res
      .set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      .set('ETag', etag)
      .set('Surrogate-Key', `space:${spaceId} type:${typeKey}`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(parsed.body));
    return;
  }

  trackCacheMiss().catch(() => {});

  // ── Parse advanced filters & sort ──
  const filterConditions = parseFilters(req.query as Record<string, string>);
  const sortDirectives = parseSortDirectives(sortParam);

  // ── Query published_documents (single table, no joins) ──
  const where: Record<string, unknown> = {
    spaceId,
    contentTypeKey: typeKey,
    ...(slug ? { slug } : {}),
  };

  const docs = await prisma.publishedDocument.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
  });

  // ── Apply in-memory filters ──
  let items = docs.map((doc) => ({
    id: doc.entryId,
    type: doc.contentTypeKey,
    slug: doc.slug,
    data: (doc.data ?? {}) as Record<string, unknown>,
    publishedAt: doc.publishedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }));

  if (filterConditions.length > 0) {
    items = items.filter((item) => applyFilters(filterConditions, item.data));
  }

  // ── Apply sorting ──
  if (sortDirectives.length > 0) {
    items = applySorting(items, sortDirectives);
  }

  // ── Pagination (post-filter) ──
  const total = items.length;
  const skip = (page - 1) * limit;
  const paged = items.slice(skip, skip + limit);

  // ── Field projection ──
  const projected = paged.map((item) => ({
    ...item,
    data: projectFields(item.data, fields),
  }));

  const body = {
    items: projected,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  const etag = computeEtag(body);

  // ── ETag match ──
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  // ── Cache the response + register Surrogate-Key tags ──
  setCachedResponse(cacheKey, JSON.stringify({ etag, body }), CACHE_TTL).catch(() => {});
  const surrogateKeys = buildSurrogateKeyTags(spaceId, typeKey);
  addCacheTag(cacheKey, surrogateKeys).catch(() => {});

  res
    .set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    .set('ETag', etag)
    .set('Surrogate-Key', surrogateKeys.join(' '))
    .json(body);
});

// ── GET /content/:typeKey/:id ────────────────────────────────────────
router.get('/:typeKey/:id', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const typeKey = req.params.typeKey as string;
  const id = req.params.id as string;
  const fields = parseFields(req.query.fields as string | undefined);

  // ── Redis cache check ──
  const qHash = hashQuery({ fields: req.query.fields });
  const cacheKey = buildCacheKey(spaceId, typeKey, id, qHash);

  const cached = await getCachedResponse(cacheKey);
  if (cached) {
    trackCacheHit().catch(() => {});
    const parsed = JSON.parse(cached) as { etag: string; body: unknown };
    const etag = parsed.etag;

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res
      .set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      .set('ETag', etag)
      .set('Surrogate-Key', `space:${spaceId} type:${typeKey} entry:${id}`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(parsed.body));
    return;
  }

  trackCacheMiss().catch(() => {});

  // ── Single-row lookup from published_documents ──
  const doc = await prisma.publishedDocument.findFirst({
    where: {
      spaceId,
      contentTypeKey: typeKey,
      entryId: id,
    },
  });

  if (!doc) {
    res.status(404).json({ error: 'not_found', message: 'Entry not found or not published' });
    return;
  }

  const rawData = (doc.data ?? {}) as Record<string, unknown>;
  const data = projectFields(rawData, fields);

  const body = {
    id: doc.entryId,
    type: doc.contentTypeKey,
    slug: doc.slug,
    data,
    publishedAt: doc.publishedAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };

  const etag = computeEtag(body);

  // ── ETag match ──
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  // ── Cache the response + register Surrogate-Key tags ──
  setCachedResponse(cacheKey, JSON.stringify({ etag, body }), CACHE_TTL).catch(() => {});
  const surrogateKeys = buildSurrogateKeyTags(spaceId, typeKey, id);
  addCacheTag(cacheKey, surrogateKeys).catch(() => {});

  res
    .set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    .set('ETag', etag)
    .set('Surrogate-Key', surrogateKeys.join(' '))
    .json(body);
});

export default router;

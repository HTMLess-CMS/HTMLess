// ─── Cache Management CMA Endpoints ─────────────────────────────────
// Provides cache observability, tag inspection, and invalidation/purge
// controls via the Content Management API.

import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { requireScope } from '../../auth/middleware.js';
import { getCacheStats, getCacheKeys, getCacheTags } from '../../cache/observability.js';
import { invalidateByTags, purgeCDN } from '../../cache/tags.js';
import { invalidateBySpace } from '../../content/cache.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

// ─── GET /cache/stats ───────────────────────────────────────────────
// Returns cache hit/miss/eviction metrics.
router.get('/stats', requireScope('cma:read', 'cma:write'), async (_req: Request, res: Response) => {
  const stats = await getCacheStats();
  res.json(stats);
});

// ─── GET /cache/keys ────────────────────────────────────────────────
// List cache keys matching a glob pattern.
// Query: ?pattern=cda:space123:* (defaults to cda:*)
router.get('/keys', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  const rawPattern = req.query.pattern as string | undefined;

  // Default: list all CDA keys for the current space
  const pattern = rawPattern ?? (spaceId ? `cda:${spaceId}:*` : 'cda:*');

  const keys = await getCacheKeys(pattern);
  res.json({ keys, count: keys.length });
});

// ─── GET /cache/tags ────────────────────────────────────────────────
// List all cache tags for the current space with key counts.
router.get('/tags', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const tags = await getCacheTags(spaceId);
  res.json({ tags, count: tags.length });
});

// ─── POST /cache/invalidate ─────────────────────────────────────────
// Invalidate Redis cache keys by tag.
// Body: { tags: ["space:abc123", "type:blog-post"] }
router.post('/invalidate', requireScope('cma:write'), async (req: Request, res: Response) => {
  const { tags } = req.body as { tags?: string[] };

  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    res.status(400).json({
      error: 'validation_error',
      message: 'tags is required and must be a non-empty array of strings',
    });
    return;
  }

  const deletedCount = await invalidateByTags(tags);

  res.json({
    invalidated: true,
    tags,
    deletedKeys: deletedCount,
  });
});

// ─── POST /cache/purge ──────────────────────────────────────────────
// Purge Redis + CDN edge caches by tag.
// Body: { tags: ["space:abc123", "type:blog-post"] }
router.post('/purge', requireScope('cma:write'), async (req: Request, res: Response) => {
  const { tags } = req.body as { tags?: string[] };

  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    res.status(400).json({
      error: 'validation_error',
      message: 'tags is required and must be a non-empty array of strings',
    });
    return;
  }

  await purgeCDN(tags);

  res.json({
    purged: true,
    tags,
  });
});

// ─── DELETE /cache/all ──────────────────────────────────────────────
// Nuclear option: purge all CDA cache for the current space.
router.delete('/all', requireScope('cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  await invalidateBySpace(spaceId);

  // Also purge CDN for the entire space
  const { getCDNProvider } = await import('../../cache/cdn-purge.js');
  const cdnProvider = getCDNProvider();
  await cdnProvider.purgeByTags([`space:${spaceId}`]);

  res.json({
    purged: true,
    spaceId,
    message: 'All CDA cache for this space has been invalidated',
  });
});

export default router;

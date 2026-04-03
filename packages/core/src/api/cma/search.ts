import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

// ─── GET /search ───
router.get('/', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const q = (req.query.q as string | undefined) ?? '';
  const typesParam = (req.query.types as string | undefined) ?? 'entries,assets,schemas';
  const limit = Math.min(parseInt((req.query.limit as string) ?? '25', 10), 100);

  if (!q.trim()) {
    res.status(400).json({ error: 'validation_error', message: 'q (search query) is required' });
    return;
  }

  const types = typesParam.split(',').map((t) => t.trim());
  const pattern = `%${q}%`;

  const results: {
    entries: unknown[];
    assets: unknown[];
    schemas: unknown[];
  } = { entries: [], assets: [], schemas: [] };

  // Search entries (title, slug, body text in latest version data)
  if (types.includes('entries')) {
    const entries = await prisma.entry.findMany({
      where: {
        spaceId,
        OR: [
          { slug: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        contentType: { select: { key: true, name: true } },
        state: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: limit,
    });

    // Also search within version data for title/body matches
    const allEntries = entries.length < limit
      ? await prisma.entry.findMany({
          where: { spaceId },
          include: {
            contentType: { select: { key: true, name: true } },
            state: true,
            versions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        })
      : entries;

    const seen = new Set<string>();
    const matched: typeof entries = [];

    // First add slug-matched entries
    for (const entry of entries) {
      seen.add(entry.id);
      matched.push(entry);
    }

    // Then search in data fields
    const lowerQ = q.toLowerCase();
    for (const entry of allEntries) {
      if (seen.has(entry.id)) continue;
      if (matched.length >= limit) break;

      const latestVersion = entry.versions[0];
      if (!latestVersion) continue;

      const data = latestVersion.data as Record<string, unknown> | null;
      if (!data) continue;

      const dataStr = JSON.stringify(data).toLowerCase();
      if (dataStr.includes(lowerQ)) {
        seen.add(entry.id);
        matched.push(entry);
      }
    }

    results.entries = matched.slice(0, limit).map((entry) => ({
      id: entry.id,
      slug: entry.slug,
      contentType: entry.contentType,
      status: entry.state?.status ?? 'draft',
      latestVersion: entry.versions[0]
        ? {
            id: entry.versions[0].id,
            data: entry.versions[0].data,
            etag: entry.versions[0].etag,
          }
        : null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
  }

  // Search assets (filename, alt, caption)
  if (types.includes('assets')) {
    const assets = await prisma.asset.findMany({
      where: {
        spaceId,
        OR: [
          { filename: { contains: q, mode: 'insensitive' } },
          { alt: { contains: q, mode: 'insensitive' } },
          { caption: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: limit,
    });

    results.assets = assets.map((asset) => ({
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mimeType,
      alt: asset.alt,
      caption: asset.caption,
      bytes: asset.bytes,
      createdAt: asset.createdAt,
    }));
  }

  // Search content types (name, key)
  if (types.includes('schemas')) {
    const contentTypes = await prisma.contentType.findMany({
      where: {
        spaceId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { key: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
      take: limit,
    });

    results.schemas = contentTypes.map((ct) => ({
      id: ct.id,
      key: ct.key,
      name: ct.name,
      description: ct.description,
      fieldCount: ct.fields.length,
      createdAt: ct.createdAt,
    }));
  }

  res.json(results);
});

export default router;

import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';

import type { Request, Response } from 'express';

const router: IRouter = Router();

// ── GET /taxonomies ─────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const taxonomies = await prisma.taxonomy.findMany({
    where: { spaceId },
    include: { _count: { select: { terms: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const items = taxonomies.map(({ _count, ...tax }) => ({
    ...tax,
    termCount: _count.terms,
  }));

  res
    .set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    .json({ items, total: items.length });
});

// ── GET /taxonomies/:key ────────────────────────────────────────────
router.get('/:key', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const key = req.params.key as string;

  const taxonomy = await prisma.taxonomy.findUnique({
    where: { spaceId_key: { spaceId, key } },
    include: {
      terms: {
        orderBy: { sortOrder: 'asc' },
        include: { children: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  if (!taxonomy) {
    res.status(404).json({ error: 'not_found', message: `Taxonomy "${key}" not found` });
    return;
  }

  res
    .set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    .json(taxonomy);
});

// ── GET /taxonomies/:key/terms ──────────────────────────────────────
router.get('/:key/terms', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const key = req.params.key as string;

  const taxonomy = await prisma.taxonomy.findUnique({
    where: { spaceId_key: { spaceId, key } },
  });
  if (!taxonomy) {
    res.status(404).json({ error: 'not_found', message: `Taxonomy "${key}" not found` });
    return;
  }

  const parentId = req.query.parentId as string | undefined;

  const where: Record<string, unknown> = { taxonomyId: taxonomy.id };
  if (parentId !== undefined) {
    where.parentId = parentId === 'null' ? null : parentId;
  }

  const terms = await prisma.taxonomyTerm.findMany({
    where,
    include: { children: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  });

  res
    .set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
    .json({ items: terms, total: terms.length });
});

export default router;

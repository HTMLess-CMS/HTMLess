import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';

import type { Request, Response } from 'express';

const router: IRouter = Router();

// ── GET /blocks/definitions ─────────────────────────────────────────
router.get('/definitions', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const definitions = await prisma.blockDefinition.findMany({
    where: { spaceId },
    orderBy: { key: 'asc' },
  });

  res
    .set('Cache-Control', 'public, max-age=60')
    .json({ items: definitions, total: definitions.length });
});

// ── GET /blocks/definitions/:key ────────────────────────────────────
router.get('/definitions/:key', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const key = req.params.key as string;

  // Return the latest version
  const definition = await prisma.blockDefinition.findFirst({
    where: { spaceId, key },
    orderBy: { version: 'desc' },
  });

  if (!definition) {
    res.status(404).json({ error: 'not_found', message: `Block definition "${key}" not found` });
    return;
  }

  res
    .set('Cache-Control', 'public, max-age=60')
    .json(definition);
});

// ── GET /blocks/patterns ────────────────────────────────────────────
router.get('/patterns', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const typeKey = req.query.typeKey as string | undefined;

  let patterns;
  if (typeKey) {
    // Filter patterns whose typeKeys array contains the given key (or typeKeys is null = applies to all)
    patterns = await prisma.pattern.findMany({
      where: { spaceId },
      orderBy: { title: 'asc' },
    });
    // Post-filter: include patterns where typeKeys is null (any) or contains the key
    patterns = patterns.filter((p) => {
      if (p.typeKeys === null) return true;
      const keys = p.typeKeys as string[];
      return Array.isArray(keys) && keys.includes(typeKey);
    });
  } else {
    patterns = await prisma.pattern.findMany({
      where: { spaceId },
      orderBy: { title: 'asc' },
    });
  }

  res
    .set('Cache-Control', 'public, max-age=60')
    .json({ items: patterns, total: patterns.length });
});

// ── GET /blocks/patterns/:id ────────────────────────────────────────
router.get('/patterns/:id', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const pattern = await prisma.pattern.findFirst({
    where: { id: req.params.id as string, spaceId },
  });

  if (!pattern) {
    res.status(404).json({ error: 'not_found', message: 'Pattern not found' });
    return;
  }

  res
    .set('Cache-Control', 'public, max-age=60')
    .json(pattern);
});

export default router;

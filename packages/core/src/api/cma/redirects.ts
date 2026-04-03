import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (
    (req.params as Record<string, string>).spaceId ??
    (req.headers['x-space-id'] as string | undefined)
  );
}

// ─── GET /redirects ───
router.get('/', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const {
    limit: limitParam,
    offset: offsetParam,
  } = req.query as Record<string, string | undefined>;

  const limit = Math.min(parseInt(limitParam ?? '25', 10), 100);
  const offset = parseInt(offsetParam ?? '0', 10);

  const [redirects, total] = await Promise.all([
    prisma.redirect.findMany({
      where: { spaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.redirect.count({ where: { spaceId } }),
  ]);

  res.json({ items: redirects, total, limit, offset });
});

// ─── POST /redirects ───
router.post('/', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { fromSlug, toSlug, statusCode } = req.body;

  if (!fromSlug || !toSlug) {
    res.status(400).json({
      error: 'validation_error',
      message: 'fromSlug and toSlug are required',
    });
    return;
  }

  const code = statusCode ?? 301;
  if (code !== 301 && code !== 302) {
    res.status(400).json({
      error: 'validation_error',
      message: 'statusCode must be 301 or 302',
    });
    return;
  }

  // Upsert: if a redirect from fromSlug already exists, update it
  const redirect = await prisma.redirect.upsert({
    where: { spaceId_fromSlug: { spaceId, fromSlug } },
    create: {
      spaceId,
      fromSlug,
      toSlug,
      statusCode: code,
    },
    update: {
      toSlug,
      statusCode: code,
    },
  });

  res.status(201).json(redirect);
});

// ─── PATCH /redirects/:id ───
router.patch('/:id', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const existing = await prisma.redirect.findFirst({
    where: { id: req.params.id as string, spaceId },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Redirect not found' });
    return;
  }

  const { fromSlug, toSlug, statusCode } = req.body;

  if (statusCode !== undefined && statusCode !== 301 && statusCode !== 302) {
    res.status(400).json({
      error: 'validation_error',
      message: 'statusCode must be 301 or 302',
    });
    return;
  }

  const redirect = await prisma.redirect.update({
    where: { id: existing.id },
    data: {
      ...(fromSlug !== undefined && { fromSlug }),
      ...(toSlug !== undefined && { toSlug }),
      ...(statusCode !== undefined && { statusCode }),
    },
  });

  res.json(redirect);
});

// ─── DELETE /redirects/:id ───
router.delete('/:id', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const existing = await prisma.redirect.findFirst({
    where: { id: req.params.id as string, spaceId },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Redirect not found' });
    return;
  }

  await prisma.redirect.delete({ where: { id: existing.id } });

  res.status(204).end();
});

export default router;

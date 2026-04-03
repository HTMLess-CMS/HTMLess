import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { prisma } from '../../db.js';

const router: IRouter = Router();

// ─── GET /redirects ───
// Lists all redirects for the space.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
  const skip = (page - 1) * limit;

  const [redirects, total] = await Promise.all([
    prisma.redirect.findMany({
      where: { spaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.redirect.count({ where: { spaceId } }),
  ]);

  res
    .set('Cache-Control', 'public, max-age=60')
    .json({
      items: redirects.map((r) => ({
        id: r.id,
        fromSlug: r.fromSlug,
        toSlug: r.toSlug,
        statusCode: r.statusCode,
        createdAt: r.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
});

// ─── GET /redirects/:slug ───
// Looks up a redirect by the source slug.
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const slug = req.params.slug as string;

  const redirect = await prisma.redirect.findUnique({
    where: { spaceId_fromSlug: { spaceId, fromSlug: slug } },
  });

  if (!redirect) {
    res.status(404).json({ error: 'not_found', message: 'No redirect found for this slug' });
    return;
  }

  res
    .set('Cache-Control', 'public, max-age=300')
    .json({
      id: redirect.id,
      fromSlug: redirect.fromSlug,
      toSlug: redirect.toSlug,
      statusCode: redirect.statusCode,
      createdAt: redirect.createdAt.toISOString(),
    });
});

export default router;

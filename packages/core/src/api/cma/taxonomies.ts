import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

// ═══════════════════════════════════════════════════════════════════════
// Taxonomy CRUD
// ═══════════════════════════════════════════════════════════════════════

// ─── GET /taxonomies ───
router.get('/', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
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

  res.json({ items, total: items.length });
});

// ─── POST /taxonomies ───
router.post('/', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { key, name, hierarchical } = req.body;

  if (!key || !name) {
    res.status(400).json({ error: 'validation_error', message: 'key and name are required' });
    return;
  }

  const existing = await prisma.taxonomy.findUnique({
    where: { spaceId_key: { spaceId, key } },
  });
  if (existing) {
    res.status(409).json({ error: 'conflict', message: `Taxonomy with key "${key}" already exists in this space` });
    return;
  }

  const taxonomy = await prisma.taxonomy.create({
    data: {
      spaceId,
      key,
      name,
      hierarchical: hierarchical ?? false,
    },
  });

  res.status(201).json(taxonomy);
});

// ─── GET /taxonomies/:key ───
router.get('/:key', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;

  const taxonomy = await prisma.taxonomy.findUnique({
    where: { spaceId_key: { spaceId, key } },
    include: {
      terms: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!taxonomy) {
    res.status(404).json({ error: 'not_found', message: `Taxonomy "${key}" not found` });
    return;
  }

  res.json(taxonomy);
});

// ─── PATCH /taxonomies/:key ───
router.patch('/:key', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;

  const existing = await prisma.taxonomy.findUnique({
    where: { spaceId_key: { spaceId, key } },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: `Taxonomy "${key}" not found` });
    return;
  }

  const { name, hierarchical } = req.body;

  const taxonomy = await prisma.taxonomy.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined && { name }),
      ...(hierarchical !== undefined && { hierarchical }),
    },
  });

  res.json(taxonomy);
});

// ─── DELETE /taxonomies/:key ───
router.delete('/:key', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;

  const existing = await prisma.taxonomy.findUnique({
    where: { spaceId_key: { spaceId, key } },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: `Taxonomy "${key}" not found` });
    return;
  }

  await prisma.taxonomy.delete({ where: { id: existing.id } });

  res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════════════
// Taxonomy Term CRUD
// ═══════════════════════════════════════════════════════════════════════

// ─── GET /taxonomies/:key/terms ───
router.get('/:key/terms', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
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

  res.json({ items: terms, total: terms.length });
});

// ─── POST /taxonomies/:key/terms ───
router.post('/:key/terms', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
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

  const { slug, name, parentId, sortOrder } = req.body;

  if (!slug || !name) {
    res.status(400).json({ error: 'validation_error', message: 'slug and name are required' });
    return;
  }

  // Check for duplicate slug within taxonomy
  const existingTerm = await prisma.taxonomyTerm.findUnique({
    where: { taxonomyId_slug: { taxonomyId: taxonomy.id, slug } },
  });
  if (existingTerm) {
    res.status(409).json({ error: 'conflict', message: `Term with slug "${slug}" already exists in this taxonomy` });
    return;
  }

  // Validate parentId if provided
  if (parentId) {
    if (!taxonomy.hierarchical) {
      res.status(400).json({ error: 'validation_error', message: 'Cannot set parentId on a non-hierarchical taxonomy' });
      return;
    }
    const parentTerm = await prisma.taxonomyTerm.findFirst({
      where: { id: parentId, taxonomyId: taxonomy.id },
    });
    if (!parentTerm) {
      res.status(404).json({ error: 'not_found', message: 'Parent term not found in this taxonomy' });
      return;
    }
  }

  // Auto-compute sortOrder if not provided
  let finalSortOrder = sortOrder;
  if (finalSortOrder === undefined) {
    const maxTerm = await prisma.taxonomyTerm.findFirst({
      where: { taxonomyId: taxonomy.id, parentId: parentId ?? null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    finalSortOrder = (maxTerm?.sortOrder ?? -1) + 1;
  }

  const term = await prisma.taxonomyTerm.create({
    data: {
      taxonomyId: taxonomy.id,
      slug,
      name,
      parentId: parentId ?? null,
      sortOrder: finalSortOrder,
    },
    include: { children: true },
  });

  res.status(201).json(term);
});

// ─── PATCH /taxonomies/:key/terms/:slug ───
router.patch('/:key/terms/:slug', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;
  const slug = req.params.slug as string;

  const taxonomy = await prisma.taxonomy.findUnique({
    where: { spaceId_key: { spaceId, key } },
  });
  if (!taxonomy) {
    res.status(404).json({ error: 'not_found', message: `Taxonomy "${key}" not found` });
    return;
  }

  const existingTerm = await prisma.taxonomyTerm.findUnique({
    where: { taxonomyId_slug: { taxonomyId: taxonomy.id, slug } },
  });
  if (!existingTerm) {
    res.status(404).json({ error: 'not_found', message: `Term "${slug}" not found` });
    return;
  }

  const { name, parentId, sortOrder } = req.body;

  // Validate parentId if provided
  if (parentId !== undefined && parentId !== null) {
    if (!taxonomy.hierarchical) {
      res.status(400).json({ error: 'validation_error', message: 'Cannot set parentId on a non-hierarchical taxonomy' });
      return;
    }
    if (parentId === existingTerm.id) {
      res.status(400).json({ error: 'validation_error', message: 'A term cannot be its own parent' });
      return;
    }
    const parentTerm = await prisma.taxonomyTerm.findFirst({
      where: { id: parentId, taxonomyId: taxonomy.id },
    });
    if (!parentTerm) {
      res.status(404).json({ error: 'not_found', message: 'Parent term not found in this taxonomy' });
      return;
    }
  }

  const term = await prisma.taxonomyTerm.update({
    where: { id: existingTerm.id },
    data: {
      ...(name !== undefined && { name }),
      ...(parentId !== undefined && { parentId }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
    include: { children: true },
  });

  res.json(term);
});

// ─── DELETE /taxonomies/:key/terms/:slug ───
router.delete('/:key/terms/:slug', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;
  const slug = req.params.slug as string;

  const taxonomy = await prisma.taxonomy.findUnique({
    where: { spaceId_key: { spaceId, key } },
  });
  if (!taxonomy) {
    res.status(404).json({ error: 'not_found', message: `Taxonomy "${key}" not found` });
    return;
  }

  const existingTerm = await prisma.taxonomyTerm.findUnique({
    where: { taxonomyId_slug: { taxonomyId: taxonomy.id, slug } },
  });
  if (!existingTerm) {
    res.status(404).json({ error: 'not_found', message: `Term "${slug}" not found` });
    return;
  }

  await prisma.taxonomyTerm.delete({ where: { id: existingTerm.id } });

  res.status(204).end();
});

export default router;

import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Block Definitions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── GET /definitions ───
router.get('/definitions', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const definitions = await prisma.blockDefinition.findMany({
    where: { spaceId },
    orderBy: { key: 'asc' },
  });

  res.json({ items: definitions, total: definitions.length });
});

// ─── POST /definitions ───
router.post('/definitions', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { key, title, description, icon, attributesSchema, allowedChildren } = req.body;

  if (!key || !title || !attributesSchema) {
    res.status(400).json({ error: 'validation_error', message: 'key, title, and attributesSchema are required' });
    return;
  }

  // Check for duplicate key (any version)
  const existing = await prisma.blockDefinition.findFirst({
    where: { spaceId, key },
  });
  if (existing) {
    res.status(409).json({ error: 'conflict', message: `Block definition with key "${key}" already exists` });
    return;
  }

  const definition = await prisma.blockDefinition.create({
    data: {
      spaceId,
      key,
      version: '1.0.0',
      title,
      description: description ?? null,
      icon: icon ?? null,
      attributesSchema,
      allowedChildren: allowedChildren ?? null,
    },
  });

  res.status(201).json(definition);
});

// ─── GET /definitions/:key ───
router.get('/definitions/:key', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
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

  res.json(definition);
});

// ─── PATCH /definitions/:key ───
router.patch('/definitions/:key', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;

  // Find the latest version
  const existing = await prisma.blockDefinition.findFirst({
    where: { spaceId, key },
    orderBy: { version: 'desc' },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: `Block definition "${key}" not found` });
    return;
  }

  const { title, description, icon, attributesSchema, allowedChildren } = req.body;

  // Bump the minor version
  const nextVersion = bumpVersion(existing.version);

  const definition = await prisma.blockDefinition.create({
    data: {
      spaceId,
      key,
      version: nextVersion,
      title: title ?? existing.title,
      description: description !== undefined ? description : existing.description,
      icon: icon !== undefined ? icon : existing.icon,
      attributesSchema: attributesSchema ?? (existing.attributesSchema as object),
      allowedChildren: allowedChildren !== undefined ? allowedChildren : (existing.allowedChildren as object | null),
      builtIn: existing.builtIn,
    },
  });

  res.json(definition);
});

// ─── DELETE /definitions/:key ───
router.delete('/definitions/:key', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;

  const existing = await prisma.blockDefinition.findFirst({
    where: { spaceId, key },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: `Block definition "${key}" not found` });
    return;
  }

  if (existing.builtIn) {
    res.status(403).json({ error: 'forbidden', message: 'Cannot delete a built-in block definition' });
    return;
  }

  // Delete all versions of this key
  await prisma.blockDefinition.deleteMany({ where: { spaceId, key } });

  res.status(204).end();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Patterns
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── GET /patterns ───
router.get('/patterns', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const patterns = await prisma.pattern.findMany({
    where: { spaceId },
    orderBy: { title: 'asc' },
  });

  res.json({ items: patterns, total: patterns.length });
});

// ─── POST /patterns ───
router.post('/patterns', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { title, description, blockTree, typeKeys } = req.body;

  if (!title || !blockTree) {
    res.status(400).json({ error: 'validation_error', message: 'title and blockTree are required' });
    return;
  }

  if (!Array.isArray(blockTree)) {
    res.status(400).json({ error: 'validation_error', message: 'blockTree must be an array' });
    return;
  }

  const pattern = await prisma.pattern.create({
    data: {
      spaceId,
      title,
      description: description ?? null,
      blockTree,
      typeKeys: typeKeys ?? null,
    },
  });

  res.status(201).json(pattern);
});

// ─── GET /patterns/:id ───
router.get('/patterns/:id', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const pattern = await prisma.pattern.findFirst({
    where: { id: req.params.id as string, spaceId },
  });

  if (!pattern) {
    res.status(404).json({ error: 'not_found', message: 'Pattern not found' });
    return;
  }

  res.json(pattern);
});

// ─── PATCH /patterns/:id ───
router.patch('/patterns/:id', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const existing = await prisma.pattern.findFirst({
    where: { id: req.params.id as string, spaceId },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Pattern not found' });
    return;
  }

  const { title, description, blockTree, typeKeys } = req.body;

  if (blockTree !== undefined && !Array.isArray(blockTree)) {
    res.status(400).json({ error: 'validation_error', message: 'blockTree must be an array' });
    return;
  }

  const pattern = await prisma.pattern.update({
    where: { id: existing.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(blockTree !== undefined && { blockTree }),
      ...(typeKeys !== undefined && { typeKeys }),
    },
  });

  res.json(pattern);
});

// ─── DELETE /patterns/:id ───
router.delete('/patterns/:id', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const existing = await prisma.pattern.findFirst({
    where: { id: req.params.id as string, spaceId },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Pattern not found' });
    return;
  }

  await prisma.pattern.delete({ where: { id: existing.id } });

  res.status(204).end();
});

// ─── Helpers ───

function bumpVersion(current: string): string {
  const parts = current.split('.').map(Number);
  parts[1] = (parts[1] ?? 0) + 1;
  return parts.join('.');
}

export default router;

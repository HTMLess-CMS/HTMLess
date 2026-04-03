import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

// ─── GET /locales ───
router.get('/', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const locales = await prisma.locale.findMany({
    where: { spaceId },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ items: locales, total: locales.length });
});

// ─── POST /locales ───
router.post('/', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { code, name, isDefault } = req.body;

  if (!code || !name) {
    res.status(400).json({ error: 'validation_error', message: 'code and name are required' });
    return;
  }

  // Check for duplicate code in this space
  const existing = await prisma.locale.findUnique({
    where: { spaceId_code: { spaceId, code } },
  });
  if (existing) {
    res.status(409).json({ error: 'conflict', message: `Locale with code "${code}" already exists in this space` });
    return;
  }

  // If this locale should be default, unset any existing default
  if (isDefault) {
    await prisma.locale.updateMany({
      where: { spaceId, isDefault: true },
      data: { isDefault: false },
    });
  }

  // If no locales exist yet, force this one to be default
  const localeCount = await prisma.locale.count({ where: { spaceId } });
  const forceDefault = localeCount === 0;

  const locale = await prisma.locale.create({
    data: {
      spaceId,
      code,
      name,
      isDefault: isDefault ?? forceDefault,
    },
  });

  res.status(201).json(locale);
});

// ─── PATCH /locales/:code ───
router.patch('/:code', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const code = req.params.code as string;

  const existing = await prisma.locale.findUnique({
    where: { spaceId_code: { spaceId, code } },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: `Locale "${code}" not found` });
    return;
  }

  const { name, isDefault } = req.body;

  // If setting as default, unset any existing default
  if (isDefault) {
    await prisma.locale.updateMany({
      where: { spaceId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const locale = await prisma.locale.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined && { name }),
      ...(isDefault !== undefined && { isDefault }),
    },
  });

  res.json(locale);
});

// ─── DELETE /locales/:code ───
router.delete('/:code', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const code = req.params.code as string;

  const existing = await prisma.locale.findUnique({
    where: { spaceId_code: { spaceId, code } },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: `Locale "${code}" not found` });
    return;
  }

  if (existing.isDefault) {
    res.status(400).json({ error: 'validation_error', message: 'Cannot delete the default locale' });
    return;
  }

  await prisma.locale.delete({ where: { id: existing.id } });

  res.status(204).end();
});

export default router;

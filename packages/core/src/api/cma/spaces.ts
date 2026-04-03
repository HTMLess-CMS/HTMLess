import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';
import { getTemplate, listAllTemplates } from '../../spaces/template-registry.js';
import { provisionSpace } from '../../spaces/provisioner.js';

const router: IRouter = Router();

// ─── GET /spaces/templates ─── list available templates (must be before /:id)
router.get('/templates', async (_req, res) => {
  const templates = listAllTemplates();
  res.json({ items: templates, total: templates.length });
});

// ─── GET /spaces ─── list spaces the user has access to
router.get('/', async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: 'authentication_required' });
    return;
  }

  // API tokens are scoped to a single space
  if (req.auth.type === 'api_token' && req.auth.spaceId) {
    const space = await prisma.space.findUnique({ where: { id: req.auth.spaceId } });
    res.json({ items: space ? [space] : [], total: space ? 1 : 0 });
    return;
  }

  // For users, return spaces they have role bindings for
  const bindings = await prisma.roleBinding.findMany({
    where: { userId: req.auth.userId },
    include: { space: true },
  });

  const spaces = bindings.map((b) => b.space);
  // Deduplicate (user might have multiple roles in same space)
  const uniqueSpaces = [...new Map(spaces.map((s) => [s.id, s])).values()];

  res.json({ items: uniqueSpaces, total: uniqueSpaces.length });
});

// ─── POST /spaces ─── create a new space
router.post('/', async (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: 'authentication_required' });
    return;
  }

  const { name, slug, template: templateKey } = req.body;

  if (!name || !slug) {
    res.status(400).json({ error: 'validation_error', message: 'name and slug are required' });
    return;
  }

  // Validate slug format
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    res.status(400).json({
      error: 'validation_error',
      message: 'slug must be lowercase alphanumeric with optional hyphens, cannot start or end with a hyphen',
    });
    return;
  }

  // Check slug uniqueness
  const existing = await prisma.space.findUnique({ where: { slug } });
  if (existing) {
    res.status(409).json({ error: 'conflict', message: `Space with slug "${slug}" already exists` });
    return;
  }

  // Validate template if provided
  if (templateKey && !getTemplate(templateKey)) {
    res.status(400).json({
      error: 'validation_error',
      message: `Unknown template "${templateKey}". Use GET /spaces/templates to list available templates.`,
    });
    return;
  }

  const space = await provisionSpace(name, slug, {
    templateKey,
    userId: req.auth.userId,
  });

  res.status(201).json(space);
});

// ─── GET /spaces/:id ─── get space details
router.get('/:id', async (req, res) => {
  const space = await prisma.space.findUnique({
    where: { id: req.params.id as string },
    include: {
      locales: true,
      contentTypes: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
      taxonomies: true,
      environments: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!space) {
    res.status(404).json({ error: 'not_found', message: 'Space not found' });
    return;
  }

  res.json(space);
});

// ─── PATCH /spaces/:id ─── update space name
router.patch('/:id', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'validation_error', message: 'name is required' });
    return;
  }

  const existing = await prisma.space.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Space not found' });
    return;
  }

  const space = await prisma.space.update({
    where: { id: existing.id },
    data: { name },
  });

  res.json(space);
});

// ─── DELETE /spaces/:id ─── delete space and all data (cascading)
router.delete('/:id', async (req, res) => {
  const existing = await prisma.space.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Space not found' });
    return;
  }

  // Prisma cascade handles all child records
  await prisma.space.delete({ where: { id: existing.id } });

  res.status(204).end();
});

export default router;

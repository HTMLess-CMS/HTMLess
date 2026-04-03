import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

// ─── GET /environments ─── list environments for space
router.get('/', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const environments = await prisma.environment.findMany({
    where: { spaceId },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ items: environments, total: environments.length });
});

// ─── POST /environments ─── create environment
router.post('/', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { name, slug } = req.body;

  if (!name || !slug) {
    res.status(400).json({ error: 'validation_error', message: 'name and slug are required' });
    return;
  }

  // Validate slug format
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    res.status(400).json({
      error: 'validation_error',
      message: 'slug must be lowercase alphanumeric with optional hyphens',
    });
    return;
  }

  // Check for duplicate slug in this space
  const existing = await prisma.environment.findUnique({
    where: { spaceId_slug: { spaceId, slug } },
  });
  if (existing) {
    res.status(409).json({ error: 'conflict', message: `Environment with slug "${slug}" already exists in this space` });
    return;
  }

  const environment = await prisma.environment.create({
    data: {
      spaceId,
      name,
      slug,
      isDefault: false,
    },
  });

  res.status(201).json(environment);
});

// ─── POST /environments/:slug/promote ─── promote content from this env to another
router.post('/:slug/promote', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const sourceSlug = req.params.slug as string;
  const { targetSlug } = req.body;

  if (!targetSlug) {
    res.status(400).json({ error: 'validation_error', message: 'targetSlug is required' });
    return;
  }

  // Verify both environments exist
  const sourceEnv = await prisma.environment.findUnique({
    where: { spaceId_slug: { spaceId, slug: sourceSlug } },
  });
  if (!sourceEnv) {
    res.status(404).json({ error: 'not_found', message: `Source environment "${sourceSlug}" not found` });
    return;
  }

  const targetEnv = await prisma.environment.findUnique({
    where: { spaceId_slug: { spaceId, slug: targetSlug } },
  });
  if (!targetEnv) {
    res.status(404).json({ error: 'not_found', message: `Target environment "${targetSlug}" not found` });
    return;
  }

  // Copy all published entries from source space to target:
  // Get all entries with published state in this space
  const publishedEntries = await prisma.entry.findMany({
    where: {
      spaceId,
      state: {
        status: 'published',
      },
    },
    include: {
      state: {
        include: {
          publishedVersion: true,
        },
      },
    },
  });

  // For each published entry, update the published document in the target
  // This copies the published content snapshot
  let promotedCount = 0;
  for (const entry of publishedEntries) {
    if (!entry.state?.publishedVersion) continue;

    await prisma.publishedDocument.upsert({
      where: { entryId: entry.id },
      update: {
        data: entry.state.publishedVersion.data as object,
        publishedAt: new Date(),
        etag: entry.state.publishedVersion.etag,
      },
      create: {
        spaceId,
        entryId: entry.id,
        contentTypeKey: (await prisma.contentType.findUnique({ where: { id: entry.contentTypeId } }))!.key,
        slug: entry.slug,
        data: entry.state.publishedVersion.data as object,
        publishedAt: new Date(),
        etag: entry.state.publishedVersion.etag,
      },
    });
    promotedCount++;
  }

  res.json({
    message: `Promoted ${promotedCount} entries from "${sourceSlug}" to "${targetSlug}"`,
    promotedCount,
    source: sourceSlug,
    target: targetSlug,
  });
});

// ─── DELETE /environments/:slug ─── delete environment (not default)
router.delete('/:slug', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const slug = req.params.slug as string;

  const existing = await prisma.environment.findUnique({
    where: { spaceId_slug: { spaceId, slug } },
  });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: `Environment "${slug}" not found` });
    return;
  }

  if (existing.isDefault) {
    res.status(400).json({ error: 'validation_error', message: 'Cannot delete the default environment' });
    return;
  }

  await prisma.environment.delete({ where: { id: existing.id } });

  res.status(204).end();
});

export default router;

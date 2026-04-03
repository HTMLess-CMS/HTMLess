import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';
import { validateForPublish } from '../../schema/validator.js';
import { materializeEntry, dematerializeEntry } from '../../content/materializer.js';
import { invalidateByType } from '../../content/cache.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

function generateEtag(): string {
  return nanoid(16);
}

interface BulkResult {
  succeeded: string[];
  failed: { id: string; error: string }[];
}

// ─── POST /bulk/duplicate ───
router.post('/duplicate', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { entryIds } = req.body as { entryIds?: string[] };
  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    res.status(400).json({ error: 'validation_error', message: 'entryIds (non-empty array) is required' });
    return;
  }

  const result: BulkResult = { succeeded: [], failed: [] };

  for (const entryId of entryIds) {
    try {
      const entry = await prisma.entry.findFirst({
        where: { id: entryId as string, spaceId },
        include: {
          versions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      if (!entry) {
        result.failed.push({ id: entryId, error: 'Entry not found' });
        continue;
      }

      const latestVersion = entry.versions[0];
      if (!latestVersion) {
        result.failed.push({ id: entryId, error: 'No version found' });
        continue;
      }

      const copySlug = `${entry.slug}-copy`;
      const etag = generateEtag();

      // Check if slug already exists, append timestamp if needed
      const existingSlug = await prisma.entry.findUnique({
        where: { spaceId_contentTypeId_slug: { spaceId, contentTypeId: entry.contentTypeId, slug: copySlug } },
      });

      const finalSlug = existingSlug ? `${entry.slug}-copy-${Date.now()}` : copySlug;

      await prisma.$transaction(async (tx) => {
        const newEntry = await tx.entry.create({
          data: {
            spaceId,
            contentTypeId: entry.contentTypeId,
            slug: finalSlug,
          },
        });

        const version = await tx.entryVersion.create({
          data: {
            entryId: newEntry.id,
            kind: 'draft',
            data: latestVersion.data as object,
            etag,
            createdById: req.auth!.userId,
          },
        });

        await tx.entryState.create({
          data: {
            entryId: newEntry.id,
            status: 'draft',
            draftVersionId: version.id,
          },
        });
      });

      result.succeeded.push(entryId);
    } catch (err) {
      result.failed.push({ id: entryId, error: (err as Error).message });
    }
  }

  res.json(result);
});

// ─── POST /bulk/publish ───
router.post('/publish', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { entryIds } = req.body as { entryIds?: string[] };
  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    res.status(400).json({ error: 'validation_error', message: 'entryIds (non-empty array) is required' });
    return;
  }

  const result: BulkResult = { succeeded: [], failed: [] };

  for (const entryId of entryIds) {
    try {
      const entry = await prisma.entry.findFirst({
        where: { id: entryId as string, spaceId },
        include: { state: true },
      });

      if (!entry) {
        result.failed.push({ id: entryId, error: 'Entry not found' });
        continue;
      }

      if (!entry.state) {
        result.failed.push({ id: entryId, error: 'Entry has no state' });
        continue;
      }

      const draftVersion = await prisma.entryVersion.findUnique({
        where: { id: entry.state.draftVersionId },
      });

      if (!draftVersion) {
        result.failed.push({ id: entryId, error: 'Draft version not found' });
        continue;
      }

      // Validate for publish
      const publishErrors = await validateForPublish(entry.contentTypeId, draftVersion.data as Record<string, unknown>);
      if (publishErrors.length > 0) {
        result.failed.push({ id: entryId, error: `Validation failed: ${publishErrors.map((e) => e.message ?? e).join(', ')}` });
        continue;
      }

      const etag = generateEtag();

      await prisma.$transaction(async (tx) => {
        const publishedVersion = await tx.entryVersion.create({
          data: {
            entryId: entry.id,
            kind: 'published',
            data: draftVersion.data as object,
            etag,
            createdById: req.auth!.userId,
          },
        });

        await tx.entryState.update({
          where: { entryId: entry.id },
          data: {
            status: 'published',
            publishedVersionId: publishedVersion.id,
          },
        });

        await tx.entry.update({ where: { id: entry.id }, data: {} });
      });

      // Materialize and invalidate cache (fire-and-forget)
      const contentTypeKey = (
        await prisma.contentType.findUnique({
          where: { id: entry.contentTypeId },
          select: { key: true },
        })
      )?.key;

      materializeEntry(entry.id).catch(() => {});
      if (contentTypeKey) {
        invalidateByType(spaceId, contentTypeKey).catch(() => {});
      }

      result.succeeded.push(entryId);
    } catch (err) {
      result.failed.push({ id: entryId, error: (err as Error).message });
    }
  }

  res.json(result);
});

// ─── POST /bulk/unpublish ───
router.post('/unpublish', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { entryIds } = req.body as { entryIds?: string[] };
  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    res.status(400).json({ error: 'validation_error', message: 'entryIds (non-empty array) is required' });
    return;
  }

  const result: BulkResult = { succeeded: [], failed: [] };

  for (const entryId of entryIds) {
    try {
      const entry = await prisma.entry.findFirst({
        where: { id: entryId as string, spaceId },
        include: { state: true },
      });

      if (!entry) {
        result.failed.push({ id: entryId, error: 'Entry not found' });
        continue;
      }

      if (!entry.state || entry.state.status !== 'published') {
        result.failed.push({ id: entryId, error: 'Entry is not currently published' });
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.entryState.update({
          where: { entryId: entry.id },
          data: {
            status: 'draft',
            publishedVersionId: null,
          },
        });

        await tx.entry.update({ where: { id: entry.id }, data: {} });
      });

      // Dematerialize and invalidate cache (fire-and-forget)
      const contentTypeKey = (
        await prisma.contentType.findUnique({
          where: { id: entry.contentTypeId },
          select: { key: true },
        })
      )?.key;

      dematerializeEntry(entry.id).catch(() => {});
      if (contentTypeKey) {
        invalidateByType(spaceId, contentTypeKey).catch(() => {});
      }

      result.succeeded.push(entryId);
    } catch (err) {
      result.failed.push({ id: entryId, error: (err as Error).message });
    }
  }

  res.json(result);
});

// ─── POST /bulk/delete ───
router.post('/delete', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { entryIds } = req.body as { entryIds?: string[] };
  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    res.status(400).json({ error: 'validation_error', message: 'entryIds (non-empty array) is required' });
    return;
  }

  const result: BulkResult = { succeeded: [], failed: [] };

  for (const entryId of entryIds) {
    try {
      const entry = await prisma.entry.findFirst({
        where: { id: entryId as string, spaceId },
      });

      if (!entry) {
        result.failed.push({ id: entryId, error: 'Entry not found' });
        continue;
      }

      // Dematerialize before deleting (fire-and-forget)
      dematerializeEntry(entry.id).catch(() => {});

      await prisma.entry.delete({ where: { id: entry.id } });

      const contentTypeKey = (
        await prisma.contentType.findUnique({
          where: { id: entry.contentTypeId },
          select: { key: true },
        })
      )?.key;

      if (contentTypeKey) {
        invalidateByType(spaceId, contentTypeKey).catch(() => {});
      }

      result.succeeded.push(entryId);
    } catch (err) {
      result.failed.push({ id: entryId, error: (err as Error).message });
    }
  }

  res.json(result);
});

export default router;

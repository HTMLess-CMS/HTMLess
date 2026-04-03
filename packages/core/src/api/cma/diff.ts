import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { prisma } from '../../db.js';
import { requireScope } from '../../auth/middleware.js';
import { diffVersions } from '../../content/diff.js';

const router: IRouter = Router({ mergeParams: true });

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

// ─── GET /entries/:id/diff?from=:versionId&to=:versionId ───
// ─── GET /entries/:id/diff (compares current draft vs published) ───
router.get('/', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const entryId = req.params.id as string;

  const entry = await prisma.entry.findFirst({
    where: { id: entryId, spaceId },
    include: { state: true },
  });
  if (!entry) {
    res.status(404).json({ error: 'not_found', message: 'Entry not found' });
    return;
  }

  const fromId = req.query.from as string | undefined;
  const toId = req.query.to as string | undefined;

  let versionA: Record<string, unknown>;
  let versionB: Record<string, unknown>;
  let fromVersionId: string;
  let toVersionId: string;

  if (fromId && toId) {
    // Explicit version comparison
    const [from, to] = await Promise.all([
      prisma.entryVersion.findFirst({ where: { id: fromId, entryId } }),
      prisma.entryVersion.findFirst({ where: { id: toId, entryId } }),
    ]);

    if (!from) {
      res.status(404).json({ error: 'not_found', message: `Version "${fromId}" not found for this entry` });
      return;
    }
    if (!to) {
      res.status(404).json({ error: 'not_found', message: `Version "${toId}" not found for this entry` });
      return;
    }

    versionA = (from.data ?? {}) as Record<string, unknown>;
    versionB = (to.data ?? {}) as Record<string, unknown>;
    fromVersionId = from.id;
    toVersionId = to.id;
  } else {
    // Default: compare current draft vs published
    if (!entry.state) {
      res.status(400).json({ error: 'invalid_state', message: 'Entry has no state' });
      return;
    }

    if (!entry.state.publishedVersionId) {
      res.status(400).json({
        error: 'invalid_state',
        message: 'Entry has no published version — provide explicit from/to version IDs',
      });
      return;
    }

    const [draft, published] = await Promise.all([
      prisma.entryVersion.findUnique({ where: { id: entry.state.draftVersionId } }),
      prisma.entryVersion.findUnique({ where: { id: entry.state.publishedVersionId } }),
    ]);

    if (!draft || !published) {
      res.status(400).json({ error: 'invalid_state', message: 'Could not load draft or published version' });
      return;
    }

    versionA = (published.data ?? {}) as Record<string, unknown>;
    versionB = (draft.data ?? {}) as Record<string, unknown>;
    fromVersionId = published.id;
    toVersionId = draft.id;
  }

  const diffs = diffVersions(versionA, versionB);

  res.json({
    entryId,
    from: fromVersionId,
    to: toVersionId,
    changes: diffs,
    totalChanges: diffs.length,
  });
});

export default router;

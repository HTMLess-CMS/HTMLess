import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireScope } from '../../auth/middleware.js';
import {
  getReferencesFrom,
  getReferencesTo,
  checkReferentialIntegrity,
} from '../../content/relationships.js';

const router: IRouter = Router({ mergeParams: true });

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (
    (req.params as Record<string, string>).spaceId ??
    (req.headers['x-space-id'] as string | undefined)
  );
}

// ─── GET /entries/:id/references ───
// Returns all outbound references from this entry.
router.get('/references', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const entryId = req.params.id as string;
  const references = await getReferencesFrom(entryId, spaceId);

  res.json({ entryId, references });
});

// ─── GET /entries/:id/referenced-by ───
// Returns all entries that reference this entry (reverse lookup).
router.get('/referenced-by', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const entryId = req.params.id as string;
  const referencedBy = await getReferencesTo(entryId, spaceId);

  res.json({ entryId, referencedBy });
});

// ─── GET /entries/:id/integrity-check ───
// Checks whether this entry can be safely deleted.
router.get('/integrity-check', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const entryId = req.params.id as string;
  const result = await checkReferentialIntegrity(entryId, spaceId);

  res.json({ entryId, ...result });
});

export default router;

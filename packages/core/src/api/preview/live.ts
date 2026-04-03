import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { eventBus, type EventPayload } from '../../events/emitter.js';
import { createSSEStream } from '../../events/sse.js';

const router: IRouter = Router();

/**
 * GET /live?entryId=<id>
 *
 * Opens an SSE stream that emits `entry.draftSaved` events for the
 * specified entry.  Designed for live-preview: the frontend
 * reconnects via EventSource and refreshes its render whenever the
 * editor saves a draft.
 *
 * Requires a valid preview token (hlp_).
 */
router.get('/', (req: Request, res: Response) => {
  const entryId = req.query['entryId'] as string | undefined;

  if (!entryId) {
    res.status(400).json({ error: 'validation_error', message: 'entryId query param is required' });
    return;
  }

  // Preview tokens are scoped to a space — use that for filtering
  const spaceId = req.auth?.spaceId;

  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'Could not determine space from preview token' });
    return;
  }

  const sse = createSSEStream(res);

  const handler = (payload: EventPayload) => {
    if (payload.spaceId !== spaceId) return;
    if (payload.data['entryId'] !== entryId && payload.data['id'] !== entryId) return;
    sse.send('entry.draftSaved', payload);
  };

  eventBus.on('entry.draftSaved', handler);

  res.on('close', () => {
    eventBus.removeListener('entry.draftSaved', handler);
  });
});

export default router;

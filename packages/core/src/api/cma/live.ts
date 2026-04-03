import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { eventBus, type HtmlessEvent, type EventPayload } from '../../events/emitter.js';
import { createSSEStream } from '../../events/sse.js';

const router: IRouter = Router();

/** Events a CMA consumer is allowed to subscribe to. */
const ALLOWED_EVENTS: Set<HtmlessEvent> = new Set([
  'entry.created',
  'entry.draftSaved',
  'entry.published',
  'entry.unpublished',
  'entry.deleted',
  'asset.created',
  'asset.updated',
  'asset.deleted',
  'schema.typeCreated',
  'schema.typeUpdated',
  'schema.typeDeleted',
]);

/**
 * GET /live?events=entry.published,entry.draftSaved,asset.created
 *
 * Opens an SSE stream that forwards matching events for the
 * authenticated user's space.  Requires `X-Space-Id` header.
 */
router.get('/', (req: Request, res: Response) => {
  const spaceId =
    (req.headers['x-space-id'] as string | undefined) ??
    (req.query['spaceId'] as string | undefined);

  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'X-Space-Id header or spaceId query param is required' });
    return;
  }

  const rawEvents = (req.query['events'] as string | undefined) ?? '';
  const requested = rawEvents
    .split(',')
    .map((s) => s.trim())
    .filter((e): e is HtmlessEvent => ALLOWED_EVENTS.has(e as HtmlessEvent));

  if (requested.length === 0) {
    res.status(400).json({
      error: 'validation_error',
      message: `Provide at least one valid event via ?events=. Allowed: ${[...ALLOWED_EVENTS].join(', ')}`,
    });
    return;
  }

  const sse = createSSEStream(res);

  // Build one listener per requested event type
  const listeners: Array<{ event: HtmlessEvent; handler: (p: EventPayload) => void }> = [];

  for (const event of requested) {
    const handler = (payload: EventPayload) => {
      if (payload.spaceId !== spaceId) return;
      sse.send(event, payload);
    };
    eventBus.on(event, handler);
    listeners.push({ event, handler });
  }

  // Tear down listeners when the client disconnects
  res.on('close', () => {
    for (const { event, handler } of listeners) {
      eventBus.removeListener(event, handler);
    }
  });
});

export default router;

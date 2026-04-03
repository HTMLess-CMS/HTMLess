// ─── Lightweight GraphQL-like API endpoint ───

import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { authenticate } from '../../auth/middleware.js';
import { parseQuery } from './parser.js';
import { resolveQuery } from './resolver.js';
import { getIntrospection } from './introspection.js';

const router: IRouter = Router();

// Auth is optional — public or token-gated like CDA
router.use(authenticate({ required: false }));

// ── POST /graphql — execute a query ──
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  const { query, variables } = req.body as { query?: string; variables?: Record<string, unknown> };

  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'validation_error', message: 'query string is required' });
    return;
  }

  try {
    // Substitute variables into the query string if provided
    let processedQuery = query;
    if (variables && typeof variables === 'object') {
      for (const [key, value] of Object.entries(variables)) {
        const replacement = typeof value === 'string' ? `"${value}"` : String(value);
        processedQuery = processedQuery.replace(new RegExp(`\\$${key}`, 'g'), replacement);
      }
    }

    const parsed = parseQuery(processedQuery);
    const data = await resolveQuery(spaceId, parsed.operations);
    res.json({ data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query execution failed';
    res.status(400).json({ errors: [{ message }] });
  }
});

// ── GET /graphql/schema — introspection endpoint ──
router.get('/schema', async (req: Request, res: Response): Promise<void> => {
  const spaceId = req.headers['x-space-id'] as string;
  if (!spaceId) {
    res.status(400).json({ error: 'missing_space', message: 'X-Space-Id header is required' });
    return;
  }

  try {
    const schema = await getIntrospection(spaceId);
    res.json({ schema });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Introspection failed';
    res.status(500).json({ error: 'introspection_error', message });
  }
});

export default router;

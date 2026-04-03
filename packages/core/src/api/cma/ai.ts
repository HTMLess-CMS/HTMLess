// ─── AI Endpoints (CMA) ───

import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { generateSchemaFromPrompt } from '../../ai/schema-generator.js';
import {
  generateSummary,
  generateAltText,
  generateMetadata,
} from '../../ai/content-operations.js';

const router: IRouter = Router();

// ── POST /ai/generate-schema ──
router.post('/generate-schema', async (req: Request, res: Response): Promise<void> => {
  const { prompt } = req.body as { prompt?: string };

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'validation_error', message: 'prompt string is required' });
    return;
  }

  try {
    const result = await generateSchemaFromPrompt(prompt);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Schema generation failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

// ── POST /ai/summarize ──
router.post('/summarize', async (req: Request, res: Response): Promise<void> => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'validation_error', message: 'text string is required' });
    return;
  }

  try {
    const summary = await generateSummary(text);
    res.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Summarization failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

// ── POST /ai/alt-text ──
router.post('/alt-text', async (req: Request, res: Response): Promise<void> => {
  const { filename, mimeType } = req.body as { filename?: string; mimeType?: string };

  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'validation_error', message: 'filename string is required' });
    return;
  }

  try {
    const altText = await generateAltText(filename, mimeType ?? 'image/jpeg');
    res.json({ altText });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Alt text generation failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

// ── POST /ai/metadata ──
router.post('/metadata', async (req: Request, res: Response): Promise<void> => {
  const { data } = req.body as { data?: Record<string, unknown> };

  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'validation_error', message: 'data object is required' });
    return;
  }

  try {
    const metadata = await generateMetadata(data);
    res.json(metadata);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Metadata generation failed';
    res.status(500).json({ error: 'ai_error', message });
  }
});

export default router;

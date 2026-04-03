import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { requireScope } from '../../auth/middleware.js';
import {
  getWhiteLabelConfig,
  updateWhiteLabelConfig,
} from '../../spaces/white-label.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: import('express').Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

// ─── GET /white-label ─── get current white-label config
router.get('/', requireScope('cma:read', 'cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const config = await getWhiteLabelConfig(spaceId);

  res.json(config ?? { brandName: 'HTMLess' });
});

// ─── PATCH /white-label ─── update white-label config
router.patch('/', requireScope('cma:write'), async (req, res) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const { brandName, logoUrl, primaryColor, favicon, customDomain } = req.body;

  // Validate primaryColor format if provided
  if (primaryColor !== undefined && primaryColor !== null) {
    if (!/^#[0-9a-fA-F]{3,8}$/.test(primaryColor)) {
      res.status(400).json({
        error: 'validation_error',
        message: 'primaryColor must be a valid hex color (e.g. #6366f1)',
      });
      return;
    }
  }

  const config = await updateWhiteLabelConfig(spaceId, {
    brandName,
    logoUrl,
    primaryColor,
    favicon,
    customDomain,
  });

  res.json(config);
});

export default router;

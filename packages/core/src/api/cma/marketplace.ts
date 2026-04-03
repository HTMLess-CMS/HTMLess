// ─── Marketplace CMA Endpoints ──────────────────────────────────────
// Browse, install, and uninstall extensions from the marketplace.

import { Router } from 'express';
import type { Router as IRouter, Request, Response } from 'express';
import { requireScope } from '../../auth/middleware.js';
import {
  listAvailable,
  getMarketplaceExtension,
  installExtension,
  uninstallExtension,
  isInstalled,
  listInstalled,
} from '../../extensions/marketplace.js';
import type { MarketplaceCategory } from '../../extensions/marketplace.js';

const router: IRouter = Router();

// ─── Helpers ───

function getSpaceId(req: Request): string | undefined {
  return (req.params as Record<string, string>).spaceId ?? (req.headers['x-space-id'] as string | undefined);
}

const VALID_CATEGORIES = new Set<string>([
  'ai', 'analytics', 'commerce', 'media', 'seo', 'notifications', 'integration', 'utility',
]);

// ─── GET /marketplace ───────────────────────────────────────────────
// List available extensions, optionally filtered by category.
// Query: ?category=seo
router.get('/', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  const categoryParam = req.query.category as string | undefined;

  let category: MarketplaceCategory | undefined;
  if (categoryParam) {
    if (!VALID_CATEGORIES.has(categoryParam)) {
      res.status(400).json({
        error: 'validation_error',
        message: `Invalid category "${categoryParam}". Valid: ${Array.from(VALID_CATEGORIES).join(', ')}`,
      });
      return;
    }
    category = categoryParam as MarketplaceCategory;
  }

  const extensions = listAvailable(category);

  // Annotate with installation status if a space is specified
  const items = extensions.map((ext) => ({
    ...ext,
    installed: spaceId ? isInstalled(spaceId, ext.key) : false,
  }));

  res.json({
    items,
    total: items.length,
    categories: Array.from(VALID_CATEGORIES),
  });
});

// ─── GET /marketplace/installed ─────────────────────────────────────
// List extensions installed in the current space.
router.get('/installed', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const installedKeys = listInstalled(spaceId);
  const items = installedKeys
    .map((key) => getMarketplaceExtension(key))
    .filter(Boolean);

  res.json({ items, total: items.length });
});

// ─── GET /marketplace/:key ──────────────────────────────────────────
// Get details for a single marketplace extension.
router.get('/:key', requireScope('cma:read', 'cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  const key = req.params.key as string;

  const extension = getMarketplaceExtension(key);
  if (!extension) {
    res.status(404).json({ error: 'not_found', message: `Extension "${key}" not found` });
    return;
  }

  res.json({
    ...extension,
    installed: spaceId ? isInstalled(spaceId, extension.key) : false,
  });
});

// ─── POST /marketplace/:key/install ─────────────────────────────────
// Install an extension into the current space.
router.post('/:key/install', requireScope('cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;

  try {
    await installExtension(spaceId, key);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Installation failed';

    if (message.includes('not found')) {
      res.status(404).json({ error: 'not_found', message });
      return;
    }
    if (message.includes('already installed')) {
      res.status(409).json({ error: 'conflict', message });
      return;
    }

    res.status(400).json({ error: 'install_error', message });
    return;
  }

  const extension = getMarketplaceExtension(key);

  res.status(201).json({
    installed: true,
    extension: extension
      ? { key: extension.key, name: extension.name, version: extension.version }
      : { key },
    spaceId,
  });
});

// ─── POST /marketplace/:key/uninstall ───────────────────────────────
// Remove an extension from the current space.
router.post('/:key/uninstall', requireScope('cma:write'), async (req: Request, res: Response) => {
  const spaceId = getSpaceId(req);
  if (!spaceId) {
    res.status(400).json({ error: 'validation_error', message: 'spaceId is required' });
    return;
  }

  const key = req.params.key as string;

  try {
    await uninstallExtension(spaceId, key);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Uninstall failed';

    if (message.includes('not installed')) {
      res.status(404).json({ error: 'not_found', message });
      return;
    }

    res.status(400).json({ error: 'uninstall_error', message });
    return;
  }

  res.json({
    uninstalled: true,
    extensionKey: key,
    spaceId,
  });
});

export default router;

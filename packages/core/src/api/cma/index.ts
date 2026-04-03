import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { authenticate } from '../../auth/middleware.js';
import { requirePermission } from '../../auth/rbac.js';
import { auditMiddleware } from '../../audit/middleware.js';
import authRouter from './auth.js';
import liveRouter from './live.js';
import schemasRouter from './schemas.js';
import entriesRouter from './entries.js';
import assetsRouter from './assets.js';
import uploadsRouter from './uploads.js';
import webhooksRouter from './webhooks.js';
import blocksRouter from './blocks.js';
import extensionsRouter from './extensions.js';
import auditRouter from './audit.js';
import codegenRouter from './codegen.js';
import localesRouter from './locales.js';
import taxonomiesRouter from './taxonomies.js';
import diffRouter from './diff.js';
import searchRouter from './search.js';
import bulkRouter from './bulk.js';
import importExportRouter from './importexport.js';
import relationshipsRouter from './relationships.js';
import redirectsRouter from './redirects.js';
import aiRouter from './ai.js';
import commentsRouter from './comments.js';
import spacesRouter from './spaces.js';
import environmentsRouter from './environments.js';
import whiteLabelRouter from './white-label.js';
import cacheRouter from './cache.js';
import marketplaceRouter from './marketplace.js';

const router: IRouter = Router();

// Auth routes — /login is public, token creation routes require auth
// (auth.ts applies authenticate() selectively on its own routes)
router.use('/auth', authRouter);

// Everything below requires authentication
router.use(authenticate({ allowQueryToken: true }));

// Spaces routes — cross-space, do NOT require X-Space-Id header
router.use('/spaces', spacesRouter);

// SSE live updates — mounted before audit middleware (read-only stream)
router.use('/live', liveRouter);

// Audit logging for all CMA write operations
router.use(auditMiddleware());

router.use('/environments', requirePermission('schema.admin', 'entry.read'), environmentsRouter);
router.use('/white-label', requirePermission('schema.admin'), whiteLabelRouter);
router.use('/schemas', requirePermission('schema.admin', 'entry.read'), schemasRouter);
router.use('/entries', requirePermission('entry.read', 'entry.create'), entriesRouter);
router.use('/assets', requirePermission('asset.upload', 'entry.read'), assetsRouter);
router.use('/uploads', requirePermission('asset.upload'), uploadsRouter);
router.use('/webhooks', requirePermission('webhook.manage'), webhooksRouter);
router.use('/blocks', requirePermission('schema.admin', 'entry.read'), blocksRouter);
router.use('/extensions', requirePermission('schema.admin'), extensionsRouter);
router.use('/audit', requirePermission('schema.admin'), auditRouter);
router.use('/codegen', codegenRouter);
router.use('/locales', requirePermission('schema.admin', 'entry.read'), localesRouter);
router.use('/taxonomies', requirePermission('schema.admin', 'entry.read'), taxonomiesRouter);
router.use('/entries/:id/diff', requirePermission('entry.read'), diffRouter);
router.use('/entries/:id', requirePermission('entry.read'), relationshipsRouter);
router.use('/redirects', requirePermission('entry.read', 'entry.create'), redirectsRouter);
router.use('/ai', requirePermission('entry.read'), aiRouter);
router.use('/', requirePermission('entry.read', 'entry.create'), commentsRouter);
router.use('/search', requirePermission('entry.read'), searchRouter);
router.use('/bulk', requirePermission('entry.create', 'entry.read'), bulkRouter);
router.use('/cache', requirePermission('schema.admin'), cacheRouter);
router.use('/marketplace', requirePermission('entry.read'), marketplaceRouter);
router.use('/', requirePermission('entry.read', 'entry.create'), importExportRouter);

export default router;

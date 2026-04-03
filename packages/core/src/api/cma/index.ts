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

const router: IRouter = Router();

// Auth routes — /login is public, token creation routes require auth
// (auth.ts applies authenticate() selectively on its own routes)
router.use('/auth', authRouter);

// Everything below requires authentication
router.use(authenticate({ allowQueryToken: true }));

// SSE live updates — mounted before audit middleware (read-only stream)
router.use('/live', liveRouter);

// Audit logging for all CMA write operations
router.use(auditMiddleware());

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
router.use('/search', requirePermission('entry.read'), searchRouter);
router.use('/bulk', requirePermission('entry.create', 'entry.read'), bulkRouter);
router.use('/', requirePermission('entry.read', 'entry.create'), importExportRouter);

export default router;

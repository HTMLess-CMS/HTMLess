import { Router } from 'express';
import { authenticate } from '../../auth/middleware.js';
import authRouter from './auth.js';
import schemasRouter from './schemas.js';
import entriesRouter from './entries.js';
import assetsRouter from './assets.js';
import webhooksRouter from './webhooks.js';

const router = Router();

// Auth routes — /login is public, token creation routes require auth
// (auth.ts applies authenticate() selectively on its own routes)
router.use('/', authRouter);

// Everything below requires authentication
router.use(authenticate());

router.use('/schemas', schemasRouter);
router.use('/entries', entriesRouter);
router.use('/assets', assetsRouter);
router.use('/webhooks', webhooksRouter);

export default router;

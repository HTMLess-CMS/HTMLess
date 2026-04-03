import { Router } from 'express';
import type { Router as IRouter } from 'express';
import { authenticate } from '../../auth/middleware.js';
import contentRoutes from './content.js';
import liveRouter from './live.js';

const router: IRouter = Router();

// Preview requires a valid token — preview tokens (hlp_) are explicitly allowed
router.use(authenticate({ required: true, allowPreview: true, allowQueryToken: true }));

router.use('/content', contentRoutes);
router.use('/live', liveRouter);

export default router;

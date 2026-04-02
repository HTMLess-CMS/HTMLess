import { Router } from 'express';
import { authenticate } from '../../auth/middleware.js';
import contentRoutes from './content.js';

const router = Router();

// Preview requires a valid token — preview tokens (hlp_) are explicitly allowed
router.use(authenticate({ required: true, allowPreview: true }));

router.use('/content', contentRoutes);

export default router;

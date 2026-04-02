import { Router } from 'express';
import { authenticate } from '../../auth/middleware.js';
import contentRoutes from './content.js';
import schemasRoutes from './schemas.js';
import assetsRoutes from './assets.js';

const router = Router();

// CDA is public or token-gated — auth not strictly required
router.use(authenticate({ required: false }));

router.use('/content', contentRoutes);
router.use('/schemas', schemasRoutes);
router.use('/assets', assetsRoutes);

export default router;

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getOrgBySlug } from '../controllers/publicController';

const router = Router();

router.get('/orgs/:slug', asyncHandler(getOrgBySlug));

export default router;

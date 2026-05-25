import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { requireSuperAdmin } from '../middleware/rbac/authorize';
import {
  createOrganization,
  createOrgValidators,
  listOrganizations,
  getOrganization,
  updateOrganization,
  getUsageMetrics,
  getLogoUploadUrl,
} from '../controllers/organizationController';

const router = Router();

router.use(authenticate);

// Super-admin-only
router.post('/', requireSuperAdmin, createOrgValidators, createOrganization);
router.get('/', requireSuperAdmin, listOrganizations);
router.get('/usage-metrics', requireSuperAdmin, getUsageMetrics);

// Super-admin OR group_admin for their own org (controller enforces scoping)
router.get('/:id', getOrganization);
router.put('/:id', updateOrganization);
router.post('/:id/upload-logo', getLogoUploadUrl);

export default router;

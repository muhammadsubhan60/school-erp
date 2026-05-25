import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import { getHeader, saveHeader } from '../controllers/branchHeaderController';

const router = Router();
router.use(authenticate);

// Any authenticated user can read (needed when printing/previewing a paper)
router.get('/', authorize('exam_paper', 'read'), getHeader);
// Only principal / it_admin can configure
router.put('/', authorize('exam_paper', 'configure'), saveHeader);

export default router;

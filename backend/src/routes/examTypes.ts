import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listExamTypes,
  createExamType,
  updateExamType,
  deleteExamType,
} from '../controllers/examTypeController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('exam_paper', 'read'), listExamTypes);
router.post('/', authorize('exam_paper', 'configure'), createExamType);
router.put('/:id', authorize('exam_paper', 'configure'), updateExamType);
router.delete('/:id', authorize('exam_paper', 'configure'), deleteExamType);

export default router;

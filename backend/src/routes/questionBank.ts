import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '../controllers/questionBankController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('exam_paper', 'read'), listQuestions);
router.post('/', authorize('exam_paper', 'create'), createQuestion);
router.put('/:id', authorize('exam_paper', 'update'), updateQuestion);
router.delete('/:id', authorize('exam_paper', 'delete'), deleteQuestion);

export default router;

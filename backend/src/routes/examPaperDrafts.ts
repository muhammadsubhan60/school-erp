import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listPapers,
  getPaper,
  createPaper,
  updatePaperSections,
  submitForApproval,
  approvePaper,
  rejectPaper,
  markPrinted,
} from '../controllers/examPaperDraftController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('exam_paper', 'read'), listPapers);
router.get('/:id', authorize('exam_paper', 'read'), getPaper);
router.post('/', authorize('exam_paper', 'create'), createPaper);
router.put('/:id/sections', authorize('exam_paper', 'update'), updatePaperSections);
router.post('/:id/submit', authorize('exam_paper', 'submit'), submitForApproval);
router.post('/:id/approve', authorize('exam_paper', 'approve'), approvePaper);
router.post('/:id/reject', authorize('exam_paper', 'approve'), rejectPaper);
router.post('/:id/printed', authorize('exam_paper', 'approve'), markPrinted);

export default router;

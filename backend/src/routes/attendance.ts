import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import { asyncHandler } from '../utils/asyncHandler';
import {
  markAttendance, markAttendanceValidators,
  getAttendance, getStudentMonthlySummary, getSectionSummary, getMyAttendance,
} from '../controllers/attendanceController';

const router = Router();
router.use(authenticate);

router.get('/my-records', asyncHandler(getMyAttendance));
router.post('/', authorize('attendance', 'mark'), markAttendanceValidators, asyncHandler(markAttendance));
router.get('/', authorize('attendance', 'read'), asyncHandler(getAttendance));
router.get('/student-summary', authorize('attendance', 'read'), asyncHandler(getStudentMonthlySummary));
router.get('/section-summary', authorize('attendance', 'read'), asyncHandler(getSectionSummary));

export default router;

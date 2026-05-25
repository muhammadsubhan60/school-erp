import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listSchedules,
  getSchedule,
  upsertSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/examScheduleController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('timetable', 'read'), listSchedules);
router.get('/:id', authorize('timetable', 'read'), getSchedule);
router.post('/', authorize('timetable', 'create'), upsertSchedule);
router.put('/:id', authorize('timetable', 'update'), updateSchedule);
router.delete('/:id', authorize('timetable', 'delete'), deleteSchedule);

export default router;

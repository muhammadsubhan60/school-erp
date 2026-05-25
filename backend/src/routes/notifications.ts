import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listNotifications, markRead, markAllRead, broadcast, broadcastValidators, getUnreadCount,
} from '../controllers/notificationController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('notifications', 'read'), listNotifications);
router.get('/unread-count', authorize('notifications', 'read'), getUnreadCount);
router.post('/broadcast', authorize('notifications', 'send'), broadcastValidators, broadcast);
router.post('/:id/read', authorize('notifications', 'read'), markRead);
router.post('/mark-all-read', authorize('notifications', 'read'), markAllRead);

export default router;

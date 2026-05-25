import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { body, validationResult } from 'express-validator';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { AppError } from '../utils/errorHandler';
import { emitToUser, emitToBranch } from '../socket';

export const broadcastValidators = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('targetRole').optional().isString(),
  body('targetStudents').optional().isArray(),
  body('targetStudents.*').optional().isMongoId(),
];

export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = '1', limit = '30', unreadOnly } = req.query;
    const filter: Record<string, unknown> = {
      orgId: req.orgId,
      recipientId: req.user!.id,
    };
    if (unreadOnly === 'true') filter['isRead'] = false;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ orgId: req.orgId, recipientId: req.user!.id, isRead: false }),
    ]);

    res.json({ success: true, data: notifications, meta: { total, unreadCount, page: parseInt(page as string) } });
  } catch (err) { next(err); }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params['id'], orgId: req.orgId, recipientId: req.user!.id },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await Notification.updateMany(
      { orgId: req.orgId, recipientId: req.user!.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function broadcast(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

    const { title, message, targetRole, targetStudents } = req.body;
    // targetRole: 'all' | 'teacher' | 'student' | specific role
    // targetStudents: array of user IDs for direct messages

    const orgId = req.orgId;
    const branchId = req.user!.branchId;

    let recipientIds: Types.ObjectId[] = [];

    if (targetStudents?.length) {
      recipientIds = (targetStudents as string[]).map(id => new Types.ObjectId(id));
    } else {
      const userFilter: Record<string, unknown> = { orgId: req.orgId, branchId, active: true };
      if (targetRole && targetRole !== 'all') userFilter['role'] = targetRole;
      const users = await User.find(userFilter).select('_id').lean();
      recipientIds = users.map(u => u._id as Types.ObjectId);
    }

    if (recipientIds.length === 0) throw new AppError('No recipients found', 400);

    const docs = recipientIds.map(id => ({
      orgId,
      branchId,
      recipientId: id,
      senderId: new Types.ObjectId(req.user!.id),
      type: 'broadcast' as const,
      title,
      message,
      isRead: false,
    }));

    await Notification.insertMany(docs);

    // Push real-time to each recipient
    const payload = { type: 'broadcast', title, message };
    recipientIds.forEach(id => emitToUser(id.toString(), 'notification', payload));

    res.status(201).json({ success: true, data: { recipientCount: recipientIds.length } });
  } catch (err) { next(err); }
}

/** Internal helper: push a system notification to a user and persist it */
export async function pushNotification(opts: {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  recipientId: Types.ObjectId;
  senderId?: Types.ObjectId;
  type: 'fee_due' | 'result_published' | 'assignment_graded' | 'assignment_created' | 'resource_uploaded' | 'system';
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  const notif = await Notification.create(opts);
  emitToUser(opts.recipientId.toString(), 'notification', {
    _id: notif._id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    link: notif.link,
    createdAt: notif.createdAt,
  });
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await Notification.countDocuments({
      orgId: req.orgId,
      recipientId: req.user!.id,
      isRead: false,
    });
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
}

import { Request, Response, NextFunction } from 'express';
import { ExamSchedule } from '../models/ExamSchedule';
import { AppError } from '../utils/errorHandler';

export async function listSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, branchId } = req as any;
    const { examId, classId } = req.query;

    const filter: Record<string, unknown> = { orgId, branchId };
    if (examId) filter.examId = examId;
    if (classId) filter.classId = classId;

    const schedules = await ExamSchedule.find(filter)
      .populate('examId', 'name')
      .populate('classId', 'name section')
      .populate('slots.subjectId', 'name code')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: schedules });
  } catch (err) {
    next(err);
  }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, branchId } = req as any;
    const schedule = await ExamSchedule.findOne({ _id: req.params.id, orgId, branchId })
      .populate('examId', 'name')
      .populate('classId', 'name section')
      .populate('slots.subjectId', 'name code');

    if (!schedule) throw new AppError('Schedule not found', 404);
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function upsertSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, branchId } = req as any;
    const userId = (req as any).user?.id;
    const { examId, classId, slots } = req.body;

    if (!examId || !classId) throw new AppError('examId and classId are required', 400);

    const schedule = await ExamSchedule.findOneAndUpdate(
      { orgId, branchId, examId, classId },
      {
        $set: { slots: slots ?? [], createdById: userId },
        $setOnInsert: { orgId, branchId, examId, classId, createdById: userId },
      },
      { upsert: true, new: true }
    )
      .populate('examId', 'name')
      .populate('classId', 'name section')
      .populate('slots.subjectId', 'name code');

    res.status(200).json({ success: true, data: schedule });
  } catch (err: any) {
    if (err.code === 11000) return next(new AppError('Schedule already exists for this exam and class', 409));
    next(err);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, branchId } = req as any;
    const { slots } = req.body;

    const schedule = await ExamSchedule.findOneAndUpdate(
      { _id: req.params.id, orgId, branchId },
      { $set: { slots: slots ?? [] } },
      { new: true }
    )
      .populate('examId', 'name')
      .populate('classId', 'name section')
      .populate('slots.subjectId', 'name code');

    if (!schedule) throw new AppError('Schedule not found', 404);
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function deleteSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { orgId, branchId } = req as any;
    const schedule = await ExamSchedule.findOneAndDelete({ _id: req.params.id, orgId, branchId });
    if (!schedule) throw new AppError('Schedule not found', 404);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

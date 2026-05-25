import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { Timetable } from '../models/Timetable';

export const createTimetableValidators = [
  body('classId').isMongoId(),
  body('sectionId').isMongoId(),
  body('academicYearId').isMongoId(),
  body('effectiveFrom').optional().isISO8601(),
  body('slots').isArray({ min: 1 }),
  body('slots.*.dayOfWeek').isInt({ min: 0, max: 6 }),
  body('slots.*.periodNo').isInt({ min: 1 }),
  body('slots.*.subjectId').isMongoId(),
  body('slots.*.teacherId').isMongoId(),
];

export async function createTimetable(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId } = req.user!;
  const { classId, sectionId, academicYearId, slots, periodTimings, effectiveFrom, effectiveTo } = req.body;

  // Conflict detection: check if any teacher is double-booked for the same day+period
  const conflictCheck = await detectConflicts(orgId!, branchId!, slots, academicYearId as string, null);
  if (conflictCheck.length > 0) {
    res.status(409).json({
      success: false,
      message: 'Teacher double-booking detected',
      conflicts: conflictCheck,
    });
    return;
  }

  // Deactivate previous timetable for this section
  await Timetable.updateMany({ orgId, branchId, classId, sectionId, isActive: true }, { isActive: false, effectiveTo: new Date() });

  const timetable = await Timetable.create({
    orgId, branchId, classId, sectionId, academicYearId, slots,
    periodTimings: periodTimings ?? [],
    effectiveFrom: effectiveFrom ?? new Date(),
    effectiveTo,
    isActive: true,
  });

  res.status(201).json({ success: true, data: timetable });
}

async function detectConflicts(
  orgId: string,
  branchId: string,
  slots: { dayOfWeek: number; periodNo: number; teacherId: string }[],
  academicYearId: string,
  excludeTimetableId: string | null
): Promise<{ teacherId: string; dayOfWeek: number; periodNo: number }[]> {
  const teacherSlotPairs = slots.map(s => ({
    dayOfWeek: s.dayOfWeek,
    periodNo: s.periodNo,
    teacherId: new Types.ObjectId(s.teacherId),
  }));

  const conflicting = await Timetable.find({
    orgId,
    branchId,
    academicYearId,
    isActive: true,
    ...(excludeTimetableId ? { _id: { $ne: excludeTimetableId } } : {}),
    $or: teacherSlotPairs.map(s => ({
      slots: { $elemMatch: { dayOfWeek: s.dayOfWeek, periodNo: s.periodNo, teacherId: s.teacherId } },
    })),
  }).select('slots').lean();

  const conflicts: { teacherId: string; dayOfWeek: number; periodNo: number }[] = [];
  for (const tt of conflicting) {
    for (const s of teacherSlotPairs) {
      const match = tt.slots.find(
        ts => ts.dayOfWeek === s.dayOfWeek && ts.periodNo === s.periodNo && String(ts.teacherId) === String(s.teacherId)
      );
      if (match) conflicts.push({ teacherId: String(s.teacherId), dayOfWeek: s.dayOfWeek, periodNo: s.periodNo });
    }
  }
  return conflicts;
}

export async function getTimetable(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { classId, sectionId, teacherId, academicYearId } = req.query;

  const filter: Record<string, unknown> = { orgId, branchId, isActive: true };
  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;
  if (academicYearId) filter.academicYearId = academicYearId;

  const rawTimetables = await Timetable.find(filter)
    .populate('classId', 'name level')
    .populate('sectionId', 'name')
    .populate('slots.subjectId', 'name code')
    .populate('slots.teacherId', 'name')
    .lean();

  // Filter by teacher if requested
  const timetables = teacherId
    ? rawTimetables
        .map((tt) => ({ ...tt, slots: tt.slots.filter((s) => String(s.teacherId) === String(teacherId)) }))
        .filter((tt) => tt.slots.length > 0)
    : rawTimetables;

  res.json({ success: true, data: timetables });
}

export async function updateTimetable(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { slots, effectiveTo } = req.body;

  if (slots) {
    const tt = await Timetable.findOne({ _id: req.params.id, orgId, branchId });
    if (!tt) { res.status(404).json({ success: false, message: 'Timetable not found' }); return; }

    const excludeId = Array.isArray(req.params['id']) ? req.params['id'][0] : (req.params['id'] ?? null);
    const conflicts = await detectConflicts(orgId!, branchId!, slots, String(tt.academicYearId), excludeId);
    if (conflicts.length > 0) {
      res.status(409).json({ success: false, message: 'Teacher double-booking detected', conflicts });
      return;
    }
  }

  const { periodTimings: updatedTimings } = req.body;
  const update: Record<string, unknown> = {};
  if (slots) update.slots = slots;
  if (updatedTimings !== undefined) update.periodTimings = updatedTimings;
  if (effectiveTo) update.effectiveTo = effectiveTo;

  const tt = await Timetable.findOneAndUpdate({ _id: req.params.id, orgId, branchId }, update, { new: true });
  if (!tt) { res.status(404).json({ success: false, message: 'Timetable not found' }); return; }
  res.json({ success: true, data: tt });
}

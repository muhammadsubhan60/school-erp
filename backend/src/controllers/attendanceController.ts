import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { Attendance } from '../models/Attendance';
import { Student } from '../models/Student';
import { Branch } from '../models/Branch';

export const markAttendanceValidators = [
  body('classId').isMongoId(),
  body('sectionId').isMongoId(),
  body('date').isISO8601(),
  body('records').isArray({ min: 1 }),
  body('records.*.studentId').isMongoId(),
  body('records.*.status').isIn(['present', 'absent', 'late', 'excused']),
];

export async function markAttendance(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

  const { orgId, branchId, id: markedById } = req.user!;
  const { classId, sectionId, date, periodNo, subjectId, records } = req.body;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await Attendance.findOneAndUpdate(
    { orgId, branchId, classId, sectionId, date: { $gte: dayStart, $lte: dayEnd }, periodNo: periodNo ?? null },
    { orgId, branchId, classId, sectionId, date: dayStart, periodNo, subjectId, markedById, records },
    { upsert: true, new: true, runValidators: true }
  );

  res.json({ success: true, data: existing });
}

export async function getAttendance(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, role } = req.user!;

  // Students see only their own attendance via the dedicated endpoint
  if (role === 'student') {
    return getMyAttendance(req, res);
  }

  const { classId, sectionId, date, startDate, endDate } = req.query;

  const filter: Record<string, unknown> = { orgId, branchId };
  if (classId) filter.classId = classId;
  if (sectionId) filter.sectionId = sectionId;

  if (date) {
    const d = new Date(date as string);
    d.setHours(0, 0, 0, 0);
    const e = new Date(date as string);
    e.setHours(23, 59, 59, 999);
    filter.date = { $gte: d, $lte: e };
  } else if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
  }

  const records = await Attendance.find(filter)
    .populate('records.studentId', 'profile.name rollNo')
    .sort({ date: -1 })
    .lean();

  res.json({ success: true, data: records });
}

export async function getStudentMonthlySummary(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { studentId, month, year } = req.query;

  if (!studentId || !month || !year) {
    res.status(400).json({ success: false, message: 'studentId, month, and year are required' });
    return;
  }

  const monthStart = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
  const monthEnd = new Date(parseInt(year as string), parseInt(month as string), 0);

  const records = await Attendance.find({
    orgId,
    branchId,
    date: { $gte: monthStart, $lte: monthEnd },
    'records.studentId': new Types.ObjectId(studentId as string),
  }).lean();

  let present = 0, absent = 0, late = 0, excused = 0;

  for (const att of records) {
    const r = att.records.find((rec) => String(rec.studentId) === studentId);
    if (!r) continue;
    if (r.status === 'present') present++;
    else if (r.status === 'absent') absent++;
    else if (r.status === 'late') late++;
    else if (r.status === 'excused') excused++;
  }

  const total = present + absent + late + excused;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  // Get branch threshold
  const branch = await Branch.findOne({ orgId, _id: branchId }).lean();
  const threshold = branch?.settings?.attendanceThreshold ?? 75;
  const isShortage = total > 0 && percentage < threshold;

  res.json({
    success: true,
    data: { studentId, month, year, present, absent, late, excused, total, percentage, threshold, isShortage },
  });
}

export async function getMyAttendance(req: Request, res: Response): Promise<void> {
  const { orgId, branchId, id: userId } = req.user!;
  const { month, year } = req.query;

  if (!month || !year) {
    res.status(400).json({ success: false, message: 'month and year are required' });
    return;
  }

  const student = await Student.findOne({ orgId, branchId, userId }).lean();
  if (!student) {
    res.status(404).json({ success: false, message: 'Student profile not found' });
    return;
  }

  const monthStart = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
  const monthEnd = new Date(parseInt(year as string), parseInt(month as string), 0, 23, 59, 59);

  const attendanceDocs = await Attendance.find({
    orgId, branchId,
    date: { $gte: monthStart, $lte: monthEnd },
    'records.studentId': student._id,
  }).lean();

  const records: { date: string; status: string }[] = [];
  let present = 0, absent = 0, late = 0, excused = 0;

  for (const att of attendanceDocs) {
    const r = att.records.find((rec) => String(rec.studentId) === String(student._id));
    if (!r) continue;
    records.push({ date: att.date.toISOString().split('T')[0], status: r.status });
    if (r.status === 'present') present++;
    else if (r.status === 'absent') absent++;
    else if (r.status === 'late') late++;
    else if (r.status === 'excused') excused++;
  }

  const total = present + absent + late + excused;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  const branch = await Branch.findOne({ orgId, _id: branchId }).lean();
  const threshold = branch?.settings?.attendanceThreshold ?? 75;

  res.json({
    success: true,
    data: { records, stats: { present, absent, late, excused, total, percentage, threshold, isShortage: total > 0 && percentage < threshold } },
  });
}

export async function getSectionSummary(req: Request, res: Response): Promise<void> {
  const { orgId, branchId } = req.user!;
  const { sectionId, month, year } = req.query;

  if (!sectionId || !month || !year) {
    res.status(400).json({ success: false, message: 'sectionId, month, and year required' });
    return;
  }

  const sid = sectionId as string;
  const monthStart = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
  const monthEnd = new Date(parseInt(year as string), parseInt(month as string), 0);

  const [students, aggResult, branch] = await Promise.all([
    Student.find({ orgId, branchId, sectionId: sid, status: 'active' }).lean(),
    Attendance.aggregate([
      {
        $match: {
          orgId: new Types.ObjectId(orgId!),
          branchId: new Types.ObjectId(branchId!),
          sectionId: new Types.ObjectId(sid),
          date: { $gte: monthStart, $lte: monthEnd },
        },
      },
      { $unwind: '$records' },
      {
        $group: {
          _id: '$records.studentId',
          present: { $sum: { $cond: [{ $eq: ['$records.status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$records.status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$records.status', 'late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$records.status', 'excused'] }, 1, 0] } },
        },
      },
    ]),
    Branch.findOne({ orgId, _id: branchId }).lean(),
  ]);

  const threshold = branch?.settings?.attendanceThreshold ?? 75;
  const statsMap = new Map(aggResult.map(r => [r._id.toString(), r]));

  const summary = students.map((student) => {
    const s = statsMap.get(student._id.toString()) ?? { present: 0, absent: 0, late: 0, excused: 0 };
    const total = s.present + s.absent + s.late + s.excused;
    const percentage = total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0;
    return {
      studentId: student._id,
      name: student.profile.name,
      rollNo: student.rollNo,
      present: s.present, absent: s.absent, late: s.late, excused: s.excused,
      total, percentage,
      isShortage: total > 0 && percentage < threshold,
    };
  });

  res.json({ success: true, data: summary });
}

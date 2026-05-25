import { Request, Response, NextFunction } from 'express';
import { ExamType } from '../models/ExamType';
import { AppError } from '../utils/errorHandler';

export async function listExamTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const types = await ExamType.find({ orgId: req.orgId, branchId: req.user!.branchId })
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: types });
  } catch (err) { next(err); }
}

export async function createExamType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, totalMarks, sections } = req.body;

    const sectionTotal = sections.reduce((sum: number, s: { totalMarks: number }) => sum + s.totalMarks, 0);
    if (sectionTotal !== totalMarks) {
      throw new AppError('Section marks must sum to totalMarks', 400);
    }

    const examType = await ExamType.create({
      orgId: req.orgId,
      branchId: req.user!.branchId,
      name,
      totalMarks,
      sections,
      createdById: req.user!.id,
    });
    res.status(201).json({ success: true, data: examType });
  } catch (err) { next(err); }
}

export async function updateExamType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, totalMarks, sections, isActive } = req.body;

    if (sections && totalMarks) {
      const sectionTotal = sections.reduce((sum: number, s: { totalMarks: number }) => sum + s.totalMarks, 0);
      if (sectionTotal !== totalMarks) {
        throw new AppError('Section marks must sum to totalMarks', 400);
      }
    }

    const examType = await ExamType.findOneAndUpdate(
      { _id: req.params.id, orgId: req.orgId, branchId: req.user!.branchId },
      { name, totalMarks, sections, isActive },
      { new: true, runValidators: true }
    );
    if (!examType) throw new AppError('Exam type not found', 404);
    res.json({ success: true, data: examType });
  } catch (err) { next(err); }
}

export async function deleteExamType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const examType = await ExamType.findOneAndDelete({
      _id: req.params.id,
      orgId: req.orgId,
      branchId: req.user!.branchId,
    });
    if (!examType) throw new AppError('Exam type not found', 404);
    res.json({ success: true, message: 'Exam type deleted' });
  } catch (err) { next(err); }
}

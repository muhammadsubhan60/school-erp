import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { ExamPaperDraft } from '../models/ExamPaperDraft';
import { ExamType } from '../models/ExamType';
import { AppError } from '../utils/errorHandler';

export async function listPapers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, examId } = req.query;
    const role = req.user!.role;

    const filter: Record<string, unknown> = {
      orgId: req.orgId,
      branchId: req.user!.branchId,
    };

    // Teachers only see their own papers
    if (role === 'teacher') filter['createdById'] = req.user!.id;
    if (status) filter['status'] = status;
    if (examId) filter['examId'] = examId;

    const papers = await ExamPaperDraft.find(filter)
      .populate('examId', 'name startDate endDate')
      .populate('examTypeId', 'name totalMarks sections')
      .populate('subjectId', 'name code')
      .populate('classId', 'name level')
      .populate('createdById', 'name')
      .populate('approvedById', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: papers });
  } catch (err) { next(err); }
}

export async function getPaper(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paper = await ExamPaperDraft.findOne({
      _id: req.params.id,
      orgId: req.orgId,
      branchId: req.user!.branchId,
    })
      .populate('examId', 'name startDate endDate subjects')
      .populate('examTypeId', 'name totalMarks sections')
      .populate('subjectId', 'name code language')
      .populate('classId', 'name level')
      .populate('createdById', 'name')
      .populate('approvedById', 'name')
      .populate('sections.questions.questionId', 'text chapter difficulty type language options correctAnswer')
      .lean();

    if (!paper) throw new AppError('Paper not found', 404);
    res.json({ success: true, data: paper });
  } catch (err) { next(err); }
}

export async function createPaper(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { examId, examTypeId, subjectId, classId } = req.body;

    const examType = await ExamType.findOne({
      _id: examTypeId,
      orgId: req.orgId,
      branchId: req.user!.branchId,
      isActive: true,
    }).lean();
    if (!examType) throw new AppError('Exam type not found', 404);

    // Bootstrap empty sections from exam type template
    const sections = examType.sections.map((s) => ({
      name: s.name,
      type: s.type,
      totalMarks: s.totalMarks,
      questions: [],
    }));

    const paper = await ExamPaperDraft.create({
      orgId: req.orgId,
      branchId: req.user!.branchId,
      examId,
      examTypeId,
      subjectId,
      classId,
      createdById: req.user!.id,
      status: 'draft',
      sections,
    });

    res.status(201).json({ success: true, data: paper });
  } catch (err) { next(err); }
}

export async function updatePaperSections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sections } = req.body;

    const paper = await ExamPaperDraft.findOne({
      _id: req.params.id,
      orgId: req.orgId,
      branchId: req.user!.branchId,
      createdById: req.user!.id,
      status: { $in: ['draft', 'rejected'] },
    });
    if (!paper) throw new AppError('Paper not found or not editable', 404);

    // Validate section marks integrity against stored totalMarks (not request body value)
    for (let i = 0; i < paper.sections.length; i++) {
      const incoming = sections[i];
      if (!incoming) continue;
      const sectionTotal = incoming.questions.reduce((sum: number, q: { marks: number }) => sum + q.marks, 0);
      if (Math.abs(sectionTotal - paper.sections[i].totalMarks) > 0.01) {
        throw new AppError(`Marks in section "${paper.sections[i].name}" must sum to ${paper.sections[i].totalMarks}`, 400);
      }
    }

    // Explicitly map each question so textOverride is included
    paper.sections = sections.map((s: any, si: number) => ({
      name: s.name ?? paper.sections[si]?.name,
      type: s.type ?? paper.sections[si]?.type,
      totalMarks: paper.sections[si]?.totalMarks ?? s.totalMarks,
      questions: (s.questions ?? []).map((q: any) => ({
        questionId: q.questionId,
        marks: q.marks,
        isOverridden: q.isOverridden ?? false,
        ...(q.textOverride ? { textOverride: q.textOverride } : {}),
      })),
    }));

    paper.markModified('sections');
    await paper.save();
    res.json({ success: true, data: paper });
  } catch (err) { next(err); }
}

export async function submitForApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paper = await ExamPaperDraft.findOne({
      _id: req.params.id,
      orgId: req.orgId,
      branchId: req.user!.branchId,
      createdById: req.user!.id,
      status: { $in: ['draft', 'rejected'] },
    });
    if (!paper) throw new AppError('Paper not found or already submitted', 404);

    // Ensure all sections have required question count
    const examType = await ExamType.findById(paper.examTypeId).lean();
    if (examType) {
      for (let i = 0; i < examType.sections.length; i++) {
        const required = examType.sections[i].questionCount;
        const actual = paper.sections[i]?.questions?.length ?? 0;
        if (actual !== required) {
          throw new AppError(
            `Section "${examType.sections[i].name}" requires ${required} questions, got ${actual}`,
            400
          );
        }
      }
    }

    paper.status = 'pending_approval';
    await paper.save();
    res.json({ success: true, data: paper });
  } catch (err) { next(err); }
}

export async function approvePaper(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paper = await ExamPaperDraft.findOne({
      _id: req.params.id,
      orgId: req.orgId,
      branchId: req.user!.branchId,
      status: 'pending_approval',
    });
    if (!paper) throw new AppError('Paper not found or not pending approval', 404);

    paper.status = 'approved';
    paper.approvedById = new Types.ObjectId(req.user!.id);
    paper.approvedAt = new Date();
    await paper.save();
    res.json({ success: true, data: paper });
  } catch (err) { next(err); }
}

export async function rejectPaper(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { comment } = req.body;
    if (!comment?.trim()) throw new AppError('Rejection comment is required', 400);

    const paper = await ExamPaperDraft.findOne({
      _id: req.params.id,
      orgId: req.orgId,
      branchId: req.user!.branchId,
      status: 'pending_approval',
    });
    if (!paper) throw new AppError('Paper not found or not pending approval', 404);

    paper.status = 'rejected';
    paper.rejectedById = new Types.ObjectId(req.user!.id);
    paper.rejectionComment = comment.trim();
    await paper.save();
    res.json({ success: true, data: paper });
  } catch (err) { next(err); }
}

export async function markPrinted(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const paper = await ExamPaperDraft.findOne({
      _id: req.params.id,
      orgId: req.orgId,
      branchId: req.user!.branchId,
      status: 'approved',
    });
    if (!paper) throw new AppError('Paper not found or not approved', 404);

    paper.status = 'printed';
    await paper.save();
    res.json({ success: true, data: paper });
  } catch (err) { next(err); }
}

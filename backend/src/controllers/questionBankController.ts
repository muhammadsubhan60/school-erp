import { Request, Response, NextFunction } from 'express';
import { QuestionBank } from '../models/QuestionBank';
import { AppError } from '../utils/errorHandler';

export async function listQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId, classId, type, difficulty, chapter } = req.query;
    const role = req.user!.role;

    const filter: Record<string, unknown> = {
      orgId: req.orgId,
      branchId: req.user!.branchId,
    };

    // Teachers see only questions they created (for their subject)
    if (role === 'teacher') {
      filter['createdById'] = req.user!.id;
    }

    if (subjectId) filter['subjectId'] = subjectId;
    if (classId) filter['classId'] = classId;
    if (type) filter['type'] = type;
    if (difficulty) filter['difficulty'] = difficulty;
    if (chapter) filter['chapter'] = { $regex: chapter, $options: 'i' };

    const questions = await QuestionBank.find(filter)
      .populate('subjectId', 'name code')
      .populate('classId', 'name level')
      .populate('createdById', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: questions });
  } catch (err) { next(err); }
}

export async function createQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { subjectId, classId, type, text, chapter, difficulty, language, options, correctAnswer } = req.body;

    if (type === 'MCQ') {
      if (!Array.isArray(options) || options.length !== 4 || options.some((o: string) => !o.trim())) {
        res.status(400).json({ success: false, message: 'MCQ questions require exactly 4 non-empty options.' });
        return;
      }
      if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
        res.status(400).json({ success: false, message: 'MCQ questions require a correct answer (A, B, C, or D).' });
        return;
      }
    }

    const question = await QuestionBank.create({
      orgId: req.orgId,
      branchId: req.user!.branchId,
      subjectId,
      classId,
      type,
      text,
      chapter,
      difficulty,
      language,
      ...(type === 'MCQ' ? { options, correctAnswer } : {}),
      createdById: req.user!.id,
    });
    res.status(201).json({ success: true, data: question });
  } catch (err) { next(err); }
}

export async function updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text, chapter, difficulty, language, options, correctAnswer } = req.body;
    const role = req.user!.role;

    const filter: Record<string, unknown> = {
      _id: req.params.id,
      orgId: req.orgId,
      branchId: req.user!.branchId,
    };
    // Teachers can only edit their own questions
    if (role === 'teacher') filter['createdById'] = req.user!.id;

    const update: Record<string, unknown> = { text, chapter, difficulty, language };
    if (options !== undefined) update['options'] = options;
    if (correctAnswer !== undefined) update['correctAnswer'] = correctAnswer;

    const question = await QuestionBank.findOneAndUpdate(
      filter,
      update,
      { new: true, runValidators: true }
    );
    if (!question) throw new AppError('Question not found', 404);
    res.json({ success: true, data: question });
  } catch (err) { next(err); }
}

export async function deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = req.user!.role;
    const filter: Record<string, unknown> = {
      _id: req.params.id,
      orgId: req.orgId,
      branchId: req.user!.branchId,
    };
    if (role === 'teacher') filter['createdById'] = req.user!.id;

    const question = await QuestionBank.findOneAndDelete(filter);
    if (!question) throw new AppError('Question not found', 404);
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) { next(err); }
}

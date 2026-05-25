import { Schema, model, Document, Types } from 'mongoose';
import type { QuestionType } from './ExamType';

export type PaperDraftStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'printed';

export interface IPaperQuestion {
  questionId: Types.ObjectId;
  marks: number;
  isOverridden: boolean;
  textOverride?: string;
}

export interface IPaperDraftSection {
  name: string;
  type: QuestionType;
  totalMarks: number;
  questions: IPaperQuestion[];
}

export interface IExamPaperDraft extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  examId: Types.ObjectId;
  examTypeId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classId: Types.ObjectId;
  createdById: Types.ObjectId;
  status: PaperDraftStatus;
  sections: IPaperDraftSection[];
  approvedById?: Types.ObjectId;
  approvedAt?: Date;
  rejectedById?: Types.ObjectId;
  rejectionComment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paperQuestionSchema = new Schema<IPaperQuestion>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'QuestionBank', required: true },
    marks: { type: Number, required: true, min: 0 },
    isOverridden: { type: Boolean, default: false },
    textOverride: { type: String, default: undefined },
  },
  { _id: false }
);

const paperDraftSectionSchema = new Schema<IPaperDraftSection>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['MCQ', 'SQ', 'LQ'], required: true },
    totalMarks: { type: Number, required: true },
    questions: { type: [paperQuestionSchema], default: [] },
  },
  { _id: false }
);

const examPaperDraftSchema = new Schema<IExamPaperDraft>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    examTypeId: { type: Schema.Types.ObjectId, ref: 'ExamType', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'rejected', 'printed'],
      default: 'draft',
    },
    sections: { type: [paperDraftSectionSchema], default: [] },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedById: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionComment: { type: String, trim: true },
  },
  { timestamps: true }
);

examPaperDraftSchema.index({ orgId: 1, branchId: 1 });
examPaperDraftSchema.index({ orgId: 1, branchId: 1, examId: 1, subjectId: 1 });
examPaperDraftSchema.index({ orgId: 1, branchId: 1, status: 1 });
examPaperDraftSchema.index({ orgId: 1, branchId: 1, createdById: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
examPaperDraftSchema.plugin(tenantPlugin);

export const ExamPaperDraft = model<IExamPaperDraft>('ExamPaperDraft', examPaperDraftSchema);

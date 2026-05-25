import { Schema, model, Document, Types } from 'mongoose';

export type QuestionType = 'MCQ' | 'SQ' | 'LQ';

export interface IExamTypeSection {
  name: string;
  type: QuestionType;
  totalMarks: number;
  questionCount: number;
}

export interface IExamType extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  name: string;
  totalMarks: number;
  sections: IExamTypeSection[];
  isActive: boolean;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const examTypeSectionSchema = new Schema<IExamTypeSection>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['MCQ', 'SQ', 'LQ'], required: true },
    totalMarks: { type: Number, required: true, min: 1 },
    questionCount: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const examTypeSchema = new Schema<IExamType>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    totalMarks: { type: Number, required: true, min: 1 },
    sections: { type: [examTypeSectionSchema], required: true },
    isActive: { type: Boolean, default: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

examTypeSchema.index({ orgId: 1, branchId: 1 });
examTypeSchema.index({ orgId: 1, branchId: 1, isActive: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
examTypeSchema.plugin(tenantPlugin);

export const ExamType = model<IExamType>('ExamType', examTypeSchema);

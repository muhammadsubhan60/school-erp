import { Schema, model, Document, Types } from 'mongoose';
import type { QuestionType } from './ExamType'; // 'MCQ' | 'SQ' | 'LQ'

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Language = 'en' | 'ur';

export interface IQuestionBank extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classId: Types.ObjectId;
  type: QuestionType;
  text: string;
  chapter: string;
  difficulty: Difficulty;
  language: Language;
  // MCQ-only fields
  options?: string[];        // exactly 4 entries when type === 'MCQ'
  correctAnswer?: string;    // 'A' | 'B' | 'C' | 'D'
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const questionBankSchema = new Schema<IQuestionBank>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    type: { type: String, enum: ['MCQ', 'SQ', 'LQ'], required: true },
    text: { type: String, required: true, trim: true },
    chapter: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    language: { type: String, enum: ['en', 'ur'], default: 'en' },
    options: { type: [String], default: undefined },
    correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], default: undefined },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

questionBankSchema.index({ orgId: 1, branchId: 1, subjectId: 1, classId: 1 });
questionBankSchema.index({ orgId: 1, branchId: 1, subjectId: 1, type: 1 });
questionBankSchema.index({ orgId: 1, branchId: 1, createdById: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
questionBankSchema.plugin(tenantPlugin);

export const QuestionBank = model<IQuestionBank>('QuestionBank', questionBankSchema);

import { Schema, model, Document, Types } from 'mongoose';

export interface IPaperResult extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  paperId: Types.ObjectId;
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  isWeak: boolean;
  isAbsent: boolean;
  clearedByClearanceId?: Types.ObjectId;
  gradedAt: Date;
  gradedById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paperResultSchema = new Schema<IPaperResult>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    paperId: { type: Schema.Types.ObjectId, ref: 'Paper', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    totalMarks: { type: Number, required: true, min: 1 },
    percentage: { type: Number, required: true },
    isWeak: { type: Boolean, default: false },
    isAbsent: { type: Boolean, default: false },
    clearedByClearanceId: { type: Schema.Types.ObjectId, ref: 'ClearanceExam' },
    gradedAt: { type: Date, required: true },
    gradedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

paperResultSchema.index({ orgId: 1, branchId: 1, studentId: 1, subjectId: 1 });
paperResultSchema.index({ orgId: 1, branchId: 1, paperId: 1, studentId: 1 }, { unique: true });
paperResultSchema.index({ orgId: 1, branchId: 1, studentId: 1, isWeak: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
paperResultSchema.plugin(tenantPlugin);

export const PaperResult = model<IPaperResult>('PaperResult', paperResultSchema);

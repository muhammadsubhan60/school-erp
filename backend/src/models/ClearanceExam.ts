import { Schema, model, Document, Types } from 'mongoose';

export type ClearanceStatus = 'pending_approval' | 'scheduled' | 'completed' | 'waived';

export interface IClearanceExam extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  studentId: Types.ObjectId;
  subjectId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  triggerMonth: number;
  triggerYear: number;
  averagePercentage: number;
  status: ClearanceStatus;
  approvedById?: Types.ObjectId;
  approvedAt?: Date;
  scheduledDate?: Date;
  clearancePaperId?: Types.ObjectId;
  clearanceMarksObtained?: number;
  clearanceTotalMarks?: number;
  clearancePercentage?: number;
  clearancePassed?: boolean;
  gradedById?: Types.ObjectId;
  gradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clearanceExamSchema = new Schema<IClearanceExam>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    triggerMonth: { type: Number, required: true, min: 1, max: 12 },
    triggerYear: { type: Number, required: true },
    averagePercentage: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending_approval', 'scheduled', 'completed', 'waived'],
      default: 'pending_approval',
    },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    scheduledDate: Date,
    clearancePaperId: { type: Schema.Types.ObjectId, ref: 'Paper' },
    clearanceMarksObtained: Number,
    clearanceTotalMarks: Number,
    clearancePercentage: Number,
    clearancePassed: Boolean,
    gradedById: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: Date,
  },
  { timestamps: true }
);

clearanceExamSchema.index({ orgId: 1, branchId: 1, status: 1 });
clearanceExamSchema.index({ orgId: 1, branchId: 1, classId: 1, triggerMonth: 1, triggerYear: 1 });
clearanceExamSchema.index(
  { orgId: 1, branchId: 1, studentId: 1, subjectId: 1, triggerMonth: 1, triggerYear: 1 },
  { unique: true }
);

import { tenantPlugin } from '../utils/tenantPlugin';
clearanceExamSchema.plugin(tenantPlugin);

export const ClearanceExam = model<IClearanceExam>('ClearanceExam', clearanceExamSchema);

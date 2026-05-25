import { Schema, model, Document, Types } from 'mongoose';

export type PaperStatus = 'draft' | 'active' | 'graded';
export type PaperType = 'weekly' | 'clearance';

export interface IPaper extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  topicId?: Types.ObjectId;
  paperType: PaperType;
  weekNumber: number;
  month: number;
  year: number;
  totalMarks: number;
  scheduledDate: Date;
  status: PaperStatus;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paperSchema = new Schema<IPaper>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'SubjectTopic' },
    paperType: { type: String, enum: ['weekly', 'clearance'], default: 'weekly' },
    weekNumber: { type: Number, required: true, min: 0, max: 53 },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    totalMarks: { type: Number, required: true, min: 1 },
    scheduledDate: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'active', 'graded'], default: 'active' },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

paperSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1, subjectId: 1 });
paperSchema.index({ orgId: 1, branchId: 1, month: 1, year: 1 });
paperSchema.index({ orgId: 1, branchId: 1, teacherId: 1, month: 1, year: 1 });
paperSchema.index({ orgId: 1, branchId: 1, paperType: 1, status: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
paperSchema.plugin(tenantPlugin);

export const Paper = model<IPaper>('Paper', paperSchema);

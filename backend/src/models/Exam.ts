import { Schema, model, Document, Types } from 'mongoose';

export interface IGradeThreshold {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  remark?: string;
}

export interface IExamSubject {
  subjectId: Types.ObjectId;
  totalMarks: number;
  passingMarks: number;
  examDate?: Date;
}

export interface IExam extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  name: string;
  targetClasses: Types.ObjectId[];
  subjects: IExamSubject[];
  gradingConfig: IGradeThreshold[];
  startDate: Date;
  endDate: Date;
  isPublished: boolean;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const examSchema = new Schema<IExam>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    name: { type: String, required: true, trim: true },
    targetClasses: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
    subjects: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        totalMarks: { type: Number, required: true },
        passingMarks: { type: Number, required: true },
        examDate: Date,
      },
    ],
    gradingConfig: [
      {
        grade: { type: String, required: true },
        minPercentage: { type: Number, required: true },
        maxPercentage: { type: Number, required: true },
        remark: String,
      },
    ],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isPublished: { type: Boolean, default: false },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

examSchema.index({ orgId: 1, branchId: 1 });
examSchema.index({ orgId: 1, branchId: 1, academicYearId: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
examSchema.plugin(tenantPlugin);

export const Exam = model<IExam>('Exam', examSchema);

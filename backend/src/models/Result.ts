import { Schema, model, Document, Types } from 'mongoose';

export interface ISubjectMark {
  subjectId: Types.ObjectId;
  marksObtained: number;
  totalMarks: number;
  isAbsent: boolean;
  isPassed: boolean;
}

export interface IResult extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  examId: Types.ObjectId;
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  subjectMarks: ISubjectMark[];
  totalMarksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  classPosition?: number;
  sectionPosition?: number;
  isPassed: boolean;
  remarks?: string;
  enteredById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const resultSchema = new Schema<IResult>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    subjectMarks: [
      {
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        marksObtained: { type: Number, required: true },
        totalMarks: { type: Number, required: true },
        isAbsent: { type: Boolean, default: false },
        isPassed: { type: Boolean, default: false },
      },
    ],
    totalMarksObtained: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
    classPosition: Number,
    sectionPosition: Number,
    isPassed: { type: Boolean, required: true },
    remarks: String,
    enteredById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

resultSchema.index({ orgId: 1, branchId: 1, examId: 1 });
resultSchema.index({ orgId: 1, branchId: 1, studentId: 1 });
resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
resultSchema.plugin(tenantPlugin);

export const Result = model<IResult>('Result', resultSchema);

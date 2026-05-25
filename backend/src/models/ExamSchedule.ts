import { Schema, model, Document, Types } from 'mongoose';

export interface IExamScheduleSlot {
  subjectId: Types.ObjectId;
  date: Date;
  startTime: string; // "09:00"
  endTime: string;   // "11:30"
  syllabus: string;
}

export interface IExamSchedule extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  examId: Types.ObjectId;
  classId: Types.ObjectId;
  slots: IExamScheduleSlot[];
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const slotSchema = new Schema<IExamScheduleSlot>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    date:      { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime:   { type: String, required: true },
    syllabus:  { type: String, default: '' },
  },
  { _id: false }
);

const examScheduleSchema = new Schema<IExamSchedule>(
  {
    orgId:       { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId:    { type: Schema.Types.ObjectId, ref: 'Branch',       required: true },
    examId:      { type: Schema.Types.ObjectId, ref: 'Exam',         required: true },
    classId:     { type: Schema.Types.ObjectId, ref: 'Class',        required: true },
    slots:       { type: [slotSchema], default: [] },
    createdById: { type: Schema.Types.ObjectId, ref: 'User',         required: true },
  },
  { timestamps: true }
);

// One schedule per exam+class per branch
examScheduleSchema.index({ orgId: 1, branchId: 1, examId: 1, classId: 1 }, { unique: true });
examScheduleSchema.index({ orgId: 1, branchId: 1, classId: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
examScheduleSchema.plugin(tenantPlugin);

export const ExamSchedule = model<IExamSchedule>('ExamSchedule', examScheduleSchema);

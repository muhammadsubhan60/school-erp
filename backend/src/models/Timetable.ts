import { Schema, model, Document, Types } from 'mongoose';

export interface ITimetableSlot {
  dayOfWeek: number; // 1=Mon, 6=Sat
  periodNo: number;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  roomNo?: string;
}

export interface IPeriodTiming {
  periodNo: number;
  startTime: string; // "08:00"
  endTime: string;   // "08:45"
}

export interface ITimetable extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  slots: ITimetableSlot[];
  periodTimings: IPeriodTiming[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const timetableSchema = new Schema<ITimetable>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    slots: [
      {
        dayOfWeek: { type: Number, required: true, min: 1, max: 6 },
        periodNo: { type: Number, required: true },
        subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
        teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        roomNo: String,
      },
    ],
    periodTimings: [
      {
        periodNo: { type: Number, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
    effectiveFrom: { type: Date, required: true },
    effectiveTo: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

timetableSchema.index({ orgId: 1, branchId: 1 });
timetableSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1, isActive: 1 });
timetableSchema.index({ orgId: 1, branchId: 1, 'slots.teacherId': 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
timetableSchema.plugin(tenantPlugin);

export const Timetable = model<ITimetable>('Timetable', timetableSchema);

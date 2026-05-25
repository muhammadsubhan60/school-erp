import { Schema, model, Document, Types } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface IAttendanceRecord {
  studentId: Types.ObjectId;
  status: AttendanceStatus;
  note?: string;
}

export interface IAttendance extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  date: Date;
  periodNo?: number;
  subjectId?: Types.ObjectId;
  markedById: Types.ObjectId;
  records: IAttendanceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    date: { type: Date, required: true },
    periodNo: Number,
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    markedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    records: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
        status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

attendanceSchema.index({ orgId: 1, branchId: 1, date: -1 });
attendanceSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1, date: -1 });
attendanceSchema.index({ orgId: 1, branchId: 1, classId: 1, date: -1, periodNo: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
attendanceSchema.plugin(tenantPlugin);

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);

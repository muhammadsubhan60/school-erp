import { Schema, model, Document, Types } from 'mongoose';

export type StaffAttendanceStatus = 'present' | 'absent' | 'late' | 'on_leave';

export interface IStaffAttendance extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  staffId: Types.ObjectId;
  date: Date;
  status: StaffAttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  note?: string;
  markedById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const staffAttendanceSchema = new Schema<IStaffAttendance>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'on_leave'],
      required: true,
    },
    checkInTime: String,
    checkOutTime: String,
    note: String,
    markedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

staffAttendanceSchema.index({ orgId: 1, branchId: 1, date: -1 });
staffAttendanceSchema.index({ orgId: 1, branchId: 1, staffId: 1, date: -1 });
staffAttendanceSchema.index({ orgId: 1, branchId: 1, staffId: 1, date: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
staffAttendanceSchema.plugin(tenantPlugin);

export const StaffAttendance = model<IStaffAttendance>('StaffAttendance', staffAttendanceSchema);

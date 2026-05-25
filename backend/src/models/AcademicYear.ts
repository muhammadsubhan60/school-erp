import { Schema, model, Document, Types } from 'mongoose';

export interface IAcademicYear extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  label: string; // e.g. "2024-25"
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const academicYearSchema = new Schema<IAcademicYear>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    label: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

academicYearSchema.index({ orgId: 1, branchId: 1 });
academicYearSchema.index({ orgId: 1, branchId: 1, isCurrent: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
academicYearSchema.plugin(tenantPlugin);

export const AcademicYear = model<IAcademicYear>('AcademicYear', academicYearSchema);

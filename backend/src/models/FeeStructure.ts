import { Schema, model, Document, Types } from 'mongoose';

export interface IFeeItem {
  name: string;
  amount: number;
  isOptional: boolean;
}

export interface IFeeStructure extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  classId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  name: string;
  items: IFeeItem[];
  totalAmount: number;
  dueDay: number; // day of month when fee is due
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const feeStructureSchema = new Schema<IFeeStructure>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    name: { type: String, required: true, trim: true },
    items: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        isOptional: { type: Boolean, default: false },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    dueDay: { type: Number, default: 10, min: 1, max: 28 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

feeStructureSchema.index({ orgId: 1, branchId: 1 });
feeStructureSchema.index({ orgId: 1, branchId: 1, classId: 1, academicYearId: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
feeStructureSchema.plugin(tenantPlugin);

export const FeeStructure = model<IFeeStructure>('FeeStructure', feeStructureSchema);

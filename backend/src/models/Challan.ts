import { Schema, model, Document, Types } from 'mongoose';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'cheque';
export type ChallanStatus = 'unpaid' | 'partial' | 'paid' | 'waived' | 'overdue';

export interface IChallanItem {
  name: string;
  amount: number;
}

export interface IChallan extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  studentId: Types.ObjectId;
  classId: Types.ObjectId;
  feeStructureId: Types.ObjectId;
  month: string; // "2025-01" format
  challanNo: string;
  items: IChallanItem[];
  totalAmount: number;
  discount: number;
  waiver: number;
  netAmount: number;
  paidAmount: number;
  dueDate: Date;
  status: ChallanStatus;
  payments: {
    amount: number;
    method: PaymentMethod;
    transactionRef?: string;
    collectedById: Types.ObjectId;
    paidAt: Date;
    receiptNo?: string;
  }[];
  bankName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const challanSchema = new Schema<IChallan>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
    month: { type: String, required: true },
    challanNo: { type: String, required: true },
    items: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    waiver: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'waived', 'overdue'],
      default: 'unpaid',
    },
    payments: [
      {
        amount: { type: Number, required: true },
        method: { type: String, enum: ['cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'cheque'], required: true },
        transactionRef: String,
        collectedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        paidAt: { type: Date, default: Date.now },
        receiptNo: String,
      },
    ],
    bankName: String,
  },
  { timestamps: true }
);

challanSchema.index({ orgId: 1, studentId: 1, month: 1 }, { unique: true });
challanSchema.index({ orgId: 1, branchId: 1, month: 1, status: 1 });
challanSchema.index({ orgId: 1, challanNo: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
challanSchema.plugin(tenantPlugin);

export const Challan = model<IChallan>('Challan', challanSchema);

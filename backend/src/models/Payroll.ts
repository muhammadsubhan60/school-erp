import { Schema, model, Document, Types } from 'mongoose';

export type PayrollStatus = 'draft' | 'approved' | 'paid';

export interface IPayroll extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  staffId: Types.ObjectId;
  month: string; // "2025-01" format
  basicSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  absentDays: number;
  absentDeduction: number;
  grossSalary: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollStatus;
  approvedById?: Types.ObjectId;
  approvedAt?: Date;
  paidAt?: Date;
  paymentMethod?: string;
  payslipUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const payrollSchema = new Schema<IPayroll>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true },
    basicSalary: { type: Number, required: true },
    allowances: [{ name: String, amount: Number }],
    deductions: [{ name: String, amount: Number }],
    absentDays: { type: Number, default: 0 },
    absentDeduction: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true },
    totalDeductions: { type: Number, required: true },
    netPay: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'approved', 'paid'], default: 'draft' },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    paidAt: Date,
    paymentMethod: String,
    payslipUrl: String,
  },
  { timestamps: true }
);

payrollSchema.index({ orgId: 1, branchId: 1, staffId: 1, month: 1 }, { unique: true });
payrollSchema.index({ orgId: 1, branchId: 1, month: 1, status: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
payrollSchema.plugin(tenantPlugin);

export const Payroll = model<IPayroll>('Payroll', payrollSchema);

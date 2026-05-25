import { Schema, model, Document, Types } from 'mongoose';

export interface IUsageMetric extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  month: string; // "2025-01" format
  activeStudents: number;
  plan: string;
  ratePerStudent: number;
  totalAmount: number;
  generatedAt: Date;
  createdAt: Date;
}

const usageMetricSchema = new Schema<IUsageMetric>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    month: { type: String, required: true },
    activeStudents: { type: Number, required: true },
    plan: { type: String, required: true },
    ratePerStudent: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

usageMetricSchema.index({ orgId: 1, month: 1 });
usageMetricSchema.index({ orgId: 1, branchId: 1, month: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
usageMetricSchema.plugin(tenantPlugin);

export const UsageMetric = model<IUsageMetric>('UsageMetric', usageMetricSchema);

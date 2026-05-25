import { Schema, model, Document, Types } from 'mongoose';

export type BranchStatus = 'active' | 'inactive';

export interface IBranch extends Document {
  orgId: Types.ObjectId;
  name: string;
  code: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  principalName?: string;
  status: BranchStatus;
  settings: {
    attendanceThreshold: number;
    periodsPerDay: number;
    workingDays: number[];
    periodDurationMinutes: number;
    breakTimings: { name: string; afterPeriod: number; durationMinutes: number }[];
    gradingSystem: 'percentage' | 'grade' | 'custom';
  };
  academicThresholds: {
    weakThreshold: number;        // below this % on a paper = topic flagged weak, default 50
    failingThreshold: number;     // monthly avg below this = clearance exam triggered, default 40
    clearancePassMark: number;    // clearance exam pass %, default 40
  };
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    phone: String,
    email: String,
    principalName: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    settings: {
      attendanceThreshold: { type: Number, default: 75 },
      periodsPerDay: { type: Number, default: 7 },
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
      periodDurationMinutes: { type: Number, default: 45 },
      breakTimings: [
        {
          name: String,
          afterPeriod: Number,
          durationMinutes: Number,
        },
      ],
      gradingSystem: { type: String, enum: ['percentage', 'grade', 'custom'], default: 'percentage' },
    },
    academicThresholds: {
      weakThreshold: { type: Number, default: 50 },
      failingThreshold: { type: Number, default: 40 },
      clearancePassMark: { type: Number, default: 40 },
    },
    logoUrl: String,
  },
  { timestamps: true }
);

branchSchema.index({ orgId: 1 });
branchSchema.index({ orgId: 1, code: 1 }, { unique: true });
branchSchema.index({ orgId: 1, status: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
branchSchema.plugin(tenantPlugin);

export const Branch = model<IBranch>('Branch', branchSchema);

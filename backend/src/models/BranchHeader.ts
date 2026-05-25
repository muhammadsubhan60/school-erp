import { Schema, model, Document, Types } from 'mongoose';

export interface IBranchHeader extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  schoolName: string;
  tagline: string;
  address: string;
  logoBase64: string;
  showStudentName: boolean;
  showRollNo: boolean;
  showSection: boolean;
  updatedAt: Date;
}

const branchHeaderSchema = new Schema<IBranchHeader>(
  {
    orgId:    { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    schoolName:      { type: String, default: '' },
    tagline:         { type: String, default: '' },
    address:         { type: String, default: '' },
    logoBase64:      { type: String, default: '' },
    showStudentName: { type: Boolean, default: true },
    showRollNo:      { type: Boolean, default: true },
    showSection:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchHeaderSchema.index({ orgId: 1, branchId: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
branchHeaderSchema.plugin(tenantPlugin);

export const BranchHeader = model<IBranchHeader>('BranchHeader', branchHeaderSchema);

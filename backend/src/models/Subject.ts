import { Schema, model, Document, Types } from 'mongoose';

export interface ISubject extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  name: string;
  code: string;
  isElective: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    isElective: { type: Boolean, default: false },
  },
  { timestamps: true }
);

subjectSchema.index({ orgId: 1, branchId: 1 });
subjectSchema.index({ orgId: 1, branchId: 1, code: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
subjectSchema.plugin(tenantPlugin);

export const Subject = model<ISubject>('Subject', subjectSchema);

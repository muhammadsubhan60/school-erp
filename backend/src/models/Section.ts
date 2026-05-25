import { Schema, model, Document, Types } from 'mongoose';

export interface ISection extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  classId: Types.ObjectId;
  name: string; // e.g. "A", "B", "Science", "Arts", "Commerce"
  classTeacherId?: Types.ObjectId;
  capacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    name: { type: String, required: true, trim: true },
    classTeacherId: { type: Schema.Types.ObjectId, ref: 'User' },
    capacity: Number,
  },
  { timestamps: true }
);

sectionSchema.index({ orgId: 1, branchId: 1 });
sectionSchema.index({ orgId: 1, branchId: 1, classId: 1 });
sectionSchema.index({ orgId: 1, branchId: 1, classId: 1, name: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
sectionSchema.plugin(tenantPlugin);

export const Section = model<ISection>('Section', sectionSchema);

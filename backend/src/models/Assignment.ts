import { Schema, model, Document, Types } from 'mongoose';

export interface IAssignment extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  createdById: Types.ObjectId;
  title: string;
  description: string;
  dueDate: Date;
  totalMarks?: number;
  attachmentUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    dueDate: { type: Date, required: true },
    totalMarks: Number,
    attachmentUrl: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ orgId: 1, branchId: 1 });
assignmentSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1 });
assignmentSchema.index({ orgId: 1, branchId: 1, dueDate: -1 });

import { tenantPlugin } from '../utils/tenantPlugin';
assignmentSchema.plugin(tenantPlugin);

export const Assignment = model<IAssignment>('Assignment', assignmentSchema);

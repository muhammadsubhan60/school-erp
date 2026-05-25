import { Schema, model, Document, Types } from 'mongoose';

export type ClassLevel =
  | 'grade_9'
  | 'grade_10'
  | 'grade_11'
  | 'grade_12'
  | 'inter_1'
  | 'inter_2';

export interface IClass extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  name: string;
  level: ClassLevel;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const classSchema = new Schema<IClass>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    name: { type: String, required: true, trim: true },
    level: {
      type: String,
      enum: ['grade_9', 'grade_10', 'grade_11', 'grade_12', 'inter_1', 'inter_2'],
      required: true,
    },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

classSchema.index({ orgId: 1, branchId: 1 });
classSchema.index({ orgId: 1, branchId: 1, academicYearId: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
classSchema.plugin(tenantPlugin);

export const Class = model<IClass>('Class', classSchema);

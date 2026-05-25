import { Schema, model, Document, Types } from 'mongoose';

export interface ISubjectTopic extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  classId: Types.ObjectId;
  subjectId: Types.ObjectId;
  chapterNumber: number;
  topicName: string;
  orderIndex: number;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subjectTopicSchema = new Schema<ISubjectTopic>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    chapterNumber: { type: Number, required: true, min: 1 },
    topicName: { type: String, required: true, trim: true },
    orderIndex: { type: Number, default: 0 },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

subjectTopicSchema.index({ orgId: 1, branchId: 1, subjectId: 1, classId: 1 });
subjectTopicSchema.index(
  { orgId: 1, branchId: 1, classId: 1, subjectId: 1, topicName: 1 },
  { unique: true }
);

import { tenantPlugin } from '../utils/tenantPlugin';
subjectTopicSchema.plugin(tenantPlugin);

export const SubjectTopic = model<ISubjectTopic>('SubjectTopic', subjectTopicSchema);

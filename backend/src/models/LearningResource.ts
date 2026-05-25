import { Schema, model, Document, Types } from 'mongoose';

export type ResourceType = 'notes' | 'book' | 'past_paper' | 'video_link' | 'other';

export interface ILearningResource extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  classId: Types.ObjectId;
  subjectId?: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  title: string;
  description?: string;
  type: ResourceType;
  fileUrl?: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  externalUrl?: string;
  tags: string[];
  isPublished: boolean;
  bookmarkedBy: Types.ObjectId[];
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ILearningResource>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['notes', 'book', 'past_paper', 'video_link', 'other'],
      required: true,
    },
    fileUrl: String,
    fileKey: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    externalUrl: String,
    tags: [{ type: String, trim: true }],
    isPublished: { type: Boolean, default: false },
    bookmarkedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

schema.index({ orgId: 1, branchId: 1, classId: 1, isPublished: 1 });
schema.index({ orgId: 1, branchId: 1, uploadedBy: 1 });
schema.index({ orgId: 1, branchId: 1, subjectId: 1 });

import { tenantPlugin } from '../utils/tenantPlugin';
schema.plugin(tenantPlugin);

export const LearningResource = model<ILearningResource>('LearningResource', schema);

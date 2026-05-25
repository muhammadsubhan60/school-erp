import { Schema, model, Document, Types } from 'mongoose';

export type SubmissionStatus = 'submitted' | 'graded' | 'late';

export interface ISubmission extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  assignmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  textResponse?: string;
  fileUrl?: string;
  fileName?: string;
  submittedAt: Date;
  status: SubmissionStatus;
  marksAwarded?: number;
  feedback?: string;
  gradedById?: Types.ObjectId;
  gradedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    textResponse: String,
    fileUrl: String,
    fileName: String,
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['submitted', 'graded', 'late'], default: 'submitted' },
    marksAwarded: Number,
    feedback: String,
    gradedById: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: Date,
  },
  { timestamps: true }
);

submissionSchema.index({ orgId: 1, branchId: 1, assignmentId: 1 });
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
submissionSchema.plugin(tenantPlugin);

export const Submission = model<ISubmission>('Submission', submissionSchema);

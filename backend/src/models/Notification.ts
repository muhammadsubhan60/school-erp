import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'fee_due'
  | 'result_published'
  | 'assignment_graded'
  | 'assignment_created'
  | 'broadcast'
  | 'resource_uploaded'
  | 'system';

export interface INotification extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  recipientId: Types.ObjectId;
  senderId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['fee_due', 'result_published', 'assignment_graded', 'assignment_created', 'broadcast', 'resource_uploaded', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    isRead: { type: Boolean, default: false },
    readAt: Date,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ orgId: 1, branchId: 1, recipientId: 1, isRead: 1 });
notificationSchema.index({ orgId: 1, branchId: 1, recipientId: 1, createdAt: -1 });

import { tenantPlugin } from '../utils/tenantPlugin';
notificationSchema.plugin(tenantPlugin);

export const Notification = model<INotification>('Notification', notificationSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: string;
  jti: string;
  token: string;
  expiresAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  userId: { type: String, required: true },
  jti: { type: String, required: true },
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

refreshTokenSchema.index({ userId: 1, jti: 1 }, { unique: true });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);

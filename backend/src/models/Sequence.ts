import { Schema, model, Document, Types } from 'mongoose';

export interface ISequence extends Document {
  orgId: Types.ObjectId;
  key: string;
  value: number;
}

const sequenceSchema = new Schema<ISequence>({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  key: { type: String, required: true },
  value: { type: Number, default: 0 },
});

sequenceSchema.index({ orgId: 1, key: 1 }, { unique: true });

export const Sequence = model<ISequence>('Sequence', sequenceSchema);

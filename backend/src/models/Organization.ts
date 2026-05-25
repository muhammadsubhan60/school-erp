import { Schema, model, Document, Types } from 'mongoose';

export type OrgPlan = 'starter' | 'growth' | 'scale';
export type OrgStatus = 'active' | 'suspended' | 'trial';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  plan: OrgPlan;
  status: OrgStatus;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  logoUrl?: string;
  welcomeMessage?: string;
  settings: {
    timezone: string;
    currency: string;
    academicYearStart: number; // month index 0-11
  };
  usageBilling: {
    activeStudents: number;
    lastCountedAt?: Date;
    billingEmail?: string;
  };
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    plan: { type: String, enum: ['starter', 'growth', 'scale'], default: 'starter' },
    status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'trial' },
    contactEmail: { type: String, required: true, lowercase: true },
    contactPhone: String,
    address: String,
    logoUrl: String,
    welcomeMessage: { type: String, trim: true },
    settings: {
      timezone: { type: String, default: 'Asia/Karachi' },
      currency: { type: String, default: 'PKR' },
      academicYearStart: { type: Number, default: 3 }, // April
    },
    usageBilling: {
      activeStudents: { type: Number, default: 0 },
      lastCountedAt: Date,
      billingEmail: String,
    },
    trialEndsAt: Date,
  },
  { timestamps: true }
);

organizationSchema.index({ status: 1 });

export const Organization = model<IOrganization>('Organization', organizationSchema);

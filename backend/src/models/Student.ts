import { Schema, model, Document, Types } from 'mongoose';

export type StudentStatus = 'applied' | 'enrolled' | 'active' | 'graduated' | 'transferred' | 'withdrawn';
export type Gender = 'male' | 'female' | 'other';

export interface IStudent extends Document {
  orgId: Types.ObjectId;
  branchId: Types.ObjectId;
  userId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  academicYearId: Types.ObjectId;
  rollNo: string;
  admissionNo: string;
  profile: {
    name: string;
    dateOfBirth: Date;
    gender: Gender;
    cnicOrBForm: string;
    religion?: string;
    nationality?: string;
    bloodGroup?: string;
    photoUrl?: string;
    address?: string;
  };
  guardianInfo: {
    fatherName: string;
    fatherCnic?: string;
    fatherPhone: string;
    fatherOccupation?: string;
    motherName?: string;
    motherPhone?: string;
    emergencyContact?: string;
    relation?: string;
  };
  documents: {
    type: string;
    url: string;
    uploadedAt: Date;
  }[];
  status: StudentStatus;
  previousSchool?: string;
  admissionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    rollNo: { type: String, required: true },
    admissionNo: { type: String, required: true },
    profile: {
      name: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      gender: { type: String, enum: ['male', 'female', 'other'], required: true },
      cnicOrBForm: { type: String, required: true },
      religion: String,
      nationality: { type: String, default: 'Pakistani' },
      bloodGroup: String,
      photoUrl: String,
      address: String,
    },
    guardianInfo: {
      fatherName: { type: String, required: true },
      fatherCnic: String,
      fatherPhone: { type: String, required: true },
      fatherOccupation: String,
      motherName: String,
      motherPhone: String,
      emergencyContact: String,
      relation: String,
    },
    documents: [
      {
        type: { type: String },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['applied', 'enrolled', 'active', 'graduated', 'transferred', 'withdrawn'],
      default: 'applied',
    },
    previousSchool: String,
    admissionDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

studentSchema.index({ orgId: 1, branchId: 1 });
studentSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1 });
studentSchema.index({ orgId: 1, branchId: 1, classId: 1, sectionId: 1, rollNo: 1 }, { unique: true });
studentSchema.index({ orgId: 1, branchId: 1, status: 1 });
studentSchema.index({ orgId: 1, admissionNo: 1 }, { unique: true });

import { tenantPlugin } from '../utils/tenantPlugin';
studentSchema.plugin(tenantPlugin);

export const Student = model<IStudent>('Student', studentSchema);

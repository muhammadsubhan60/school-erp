import { Request, Response } from 'express';
import { body, validationResult, param } from 'express-validator';
import mongoose from 'mongoose';
import { Organization } from '../models/Organization';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { hashPassword, generateTokens, storeRefreshToken } from '../services/authService';
import { getUploadUrl, getPublicUrl } from '../services/s3Service';

export const createOrgValidators = [
  body('name').trim().notEmpty(),
  body('slug').trim().isSlug(),
  body('contactEmail').isEmail().normalizeEmail(),
  body('adminName').trim().notEmpty(),
  body('adminEmail').isEmail().normalizeEmail(),
  body('adminPassword').isLength({ min: 8 }),
];

/** Super Admin: create a new tenant organization with its first Group Admin */
export async function createOrganization(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const { name, slug, contactEmail, contactPhone, adminName, adminEmail, adminPassword, plan } = req.body;

  const existingSlug = await Organization.findOne({ slug });
  if (existingSlug) {
    res.status(409).json({ success: false, message: 'Slug already taken' });
    return;
  }

  const existingEmail = await User.findOne({ email: adminEmail });
  if (existingEmail) {
    res.status(409).json({ success: false, message: 'Admin email already registered' });
    return;
  }

  const passwordHash = await hashPassword(adminPassword);
  const session = await mongoose.startSession();
  try {
    const result = await session.withTransaction(async () => {
      const [org] = await Organization.create([{
        name,
        slug,
        contactEmail,
        contactPhone,
        plan: plan ?? 'starter',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }], { session });

      const [adminUser] = await User.create([{
        orgId: org._id,
        role: 'group_admin',
        name: adminName,
        email: adminEmail,
        passwordHash,
        active: true,
      }], { session });

      await Branch.create([{
        orgId: org._id,
        name: 'Main Branch',
        code: 'MAIN',
        address: '-',
        city: '-',
      }], { session });

      return { org, adminUser };
    });

    const { org, adminUser } = result!;
    res.status(201).json({
      success: true,
      data: { organization: org, adminUser: { id: adminUser._id.toString(), email: adminUser.email } },
    });
  } finally {
    await session.endSession();
  }
}

export async function listOrganizations(req: Request, res: Response): Promise<void> {
  const { page = '1', limit = '20', status } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const { Student } = await import('../models/Student');

  const orgs = await Organization.find(filter).skip(skip).limit(parseInt(limit as string)).sort({ createdAt: -1 }).lean();
  const orgIds = orgs.map(o => o._id);

  const [total, studentCounts] = await Promise.all([
    Organization.countDocuments(filter),
    Student.aggregate([
      { $match: { orgId: { $in: orgIds }, status: 'active' } },
      { $group: { _id: '$orgId', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap: Record<string, number> = {};
  for (const entry of studentCounts) {
    countMap[entry._id.toString()] = entry.count;
  }

  const enriched = orgs.map(org => ({
    ...org,
    usageBilling: {
      ...org.usageBilling,
      activeStudents: countMap[org._id.toString()] ?? 0,
    },
  }));

  res.json({ success: true, data: enriched, meta: { total, page: parseInt(page as string) } });
}

export async function getOrganization(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role;
  const { id } = req.params;

  if (callerRole !== 'super_admin' && req.user!.orgId?.toString() !== id) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const { Student } = await import('../models/Student');

  const [org, activeCount] = await Promise.all([
    Organization.findById(id).lean(),
    Student.countDocuments({ orgId: id, status: 'active' }),
  ]);

  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      ...org,
      usageBilling: { ...org.usageBilling, activeStudents: activeCount },
    },
  });
}

export async function updateOrganization(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role;
  const { id } = req.params;

  if (callerRole !== 'super_admin' && req.user!.orgId?.toString() !== id) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  // group_admin cannot change plan or status — only super_admin can
  const allowedFields = callerRole === 'super_admin'
    ? ['name', 'contactEmail', 'contactPhone', 'address', 'status', 'plan', 'settings', 'logoUrl', 'welcomeMessage']
    : ['name', 'contactEmail', 'contactPhone', 'address', 'settings', 'logoUrl', 'welcomeMessage'];

  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const org = await Organization.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  if (!org) {
    res.status(404).json({ success: false, message: 'Organization not found' });
    return;
  }
  res.json({ success: true, data: org });
}

export async function getUsageMetrics(req: Request, res: Response): Promise<void> {
  const { month } = req.query;
  const filter: Record<string, unknown> = {};
  if (month) filter.month = month;

  const { UsageMetric } = await import('../models/UsageMetric');
  const metrics = await UsageMetric.find(filter).sort({ month: -1 }).lean();

  res.json({ success: true, data: metrics });
}

export async function getLogoUploadUrl(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role;
  const { id } = req.params;

  if (callerRole !== 'super_admin' && req.user!.orgId?.toString() !== id) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    res.status(400).json({ success: false, message: 'filename and contentType required' });
    return;
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
  if (!allowed.includes(contentType)) {
    res.status(400).json({ success: false, message: 'Only image files are allowed' });
    return;
  }

  const result = await getUploadUrl('org-logos', filename, contentType);
  if (!result) {
    res.status(503).json({ success: false, message: 'File storage not configured' });
    return;
  }

  res.json({ success: true, data: { uploadUrl: result.uploadUrl, publicUrl: getPublicUrl(result.key) } });
}

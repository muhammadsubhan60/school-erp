import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User, UserRole } from '../models/User';
import { hashPassword } from '../services/authService';
import { withoutTenantEnforcement } from '../utils/tenantPlugin';

const CREATABLE_ROLES: Partial<Record<UserRole, UserRole[]>> = {
  group_admin: ['branch_principal', 'teacher', 'accountant', 'it_admin'],
  branch_principal: ['teacher', 'accountant', 'it_admin'],
};

export const createUserValidators = [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['branch_principal', 'teacher', 'student', 'accountant', 'it_admin']),
];

export async function createUser(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return;
  }

  const callerRole = req.user!.role as UserRole;
  const { name, email, password, role, branchId: requestedBranchId, phone } = req.body;

  const allowed = CREATABLE_ROLES[callerRole] ?? [];
  if (!allowed.includes(role as UserRole)) {
    res.status(403).json({ success: false, message: `Your role cannot create users with role '${role}'` });
    return;
  }

  const orgId = req.user!.orgId;

  const existing = await withoutTenantEnforcement(User.findOne({ email }));
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already registered' });
    return;
  }

  // branch_principal can only create staff for their own branch
  const branchId = callerRole === 'branch_principal'
    ? req.user!.branchId?.toString()
    : requestedBranchId || undefined;

  const branchRequired: UserRole[] = ['branch_principal', 'teacher', 'student', 'accountant', 'it_admin'];
  if (branchRequired.includes(role as UserRole) && !branchId) {
    res.status(400).json({ success: false, message: 'branchId is required for this role' });
    return;
  }

  const user = await User.create({
    orgId,
    branchId: branchId || undefined,
    role,
    name,
    email,
    passwordHash: await hashPassword(password),
    phone,
    active: true,
  });

  res.status(201).json({
    success: true,
    data: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role as UserRole;
  const { branchId, role, orgId: orgIdParam, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  let filter: Record<string, unknown>;

  if (callerRole === 'super_admin') {
    // Super admin sees all group_admin accounts across all orgs
    filter = { role: 'group_admin' };
    if (orgIdParam) filter.orgId = orgIdParam;
  } else if (callerRole === 'branch_principal') {
    // Branch principal sees only staff in their own branch
    filter = { orgId: req.user!.orgId, branchId: req.user!.branchId };
    if (role) filter.role = role;
  } else {
    // group_admin: all staff in their org
    filter = { orgId: req.user!.orgId };
    if (branchId) filter.branchId = branchId;
    if (role) filter.role = role;
  }

  const [users, total] = await Promise.all([
    User.find(filter).select('-passwordHash').skip(skip).limit(parseInt(limit as string)).sort({ name: 1 }).lean(),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, data: users, meta: { total, page: parseInt(page as string) } });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role as UserRole;
  const filter: Record<string, unknown> = { _id: req.params.id };
  if (callerRole !== 'super_admin') filter.orgId = req.user!.orgId;

  const user = await User.findOne(filter).select('-passwordHash');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: user });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role as UserRole;
  const allowed = ['name', 'phone', 'profilePhotoUrl', 'active', 'branchId'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const filter: Record<string, unknown> = { _id: req.params.id };
  if (callerRole !== 'super_admin') filter.orgId = req.user!.orgId;

  const user = await User.findOneAndUpdate(filter, update, { new: true }).select('-passwordHash');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: user });
}

export async function resetUserPassword(req: Request, res: Response): Promise<void> {
  const callerRole = req.user!.role as UserRole;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    return;
  }

  const filter: Record<string, unknown> = { _id: req.params.id };
  if (callerRole !== 'super_admin') filter.orgId = req.user!.orgId;

  const user = await User.findOne(filter);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  res.json({ success: true, message: 'Password reset successfully' });
}

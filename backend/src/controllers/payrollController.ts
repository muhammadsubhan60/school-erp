import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { body, validationResult } from 'express-validator';
import { Payroll } from '../models/Payroll';
import { User } from '../models/User';
import { Branch } from '../models/Branch';
import { StaffAttendance } from '../models/StaffAttendance';
import { AppError } from '../utils/errorHandler';

export const createPayrollValidators = [
  body('staffId').isMongoId(),
  body('month').matches(/^\d{4}-\d{2}$/).withMessage('month must be YYYY-MM'),
  body('basicSalary').isFloat({ min: 0 }).withMessage('basicSalary must be non-negative'),
  body('allowances').optional().isArray(),
  body('allowances.*.name').optional().trim().notEmpty(),
  body('allowances.*.amount').optional().isFloat({ min: 0 }),
  body('deductions').optional().isArray(),
  body('deductions.*.name').optional().trim().notEmpty(),
  body('deductions.*.amount').optional().isFloat({ min: 0 }),
];

export const bulkPayrollValidators = [
  body('month').matches(/^\d{4}-\d{2}$/).withMessage('month must be YYYY-MM'),
  body('staffIds').optional().isArray(),
  body('staffIds.*').optional().isMongoId(),
];

export async function listPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { month, staffId, status, page = '1', limit = '30' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const filter: Record<string, unknown> = { orgId: req.orgId, branchId: req.user!.branchId };
    if (month) filter['month'] = month;
    if (staffId) filter['staffId'] = staffId;
    if (status) filter['status'] = status;

    // Teacher can only see own payroll
    if (req.user!.role === 'teacher') filter['staffId'] = req.user!.id;

    const [payrolls, total] = await Promise.all([
      Payroll.find(filter)
        .populate('staffId', 'name email role profile')
        .populate('approvedById', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Payroll.countDocuments(filter),
    ]);

    res.json({ success: true, data: payrolls, meta: { total, page: parseInt(page as string) } });
  } catch (err) { next(err); }
}

export async function createPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

    const { staffId, month, basicSalary, allowances = [], deductions = [] } = req.body;
    const orgId = req.orgId;
    const branchId = req.user!.branchId;

    // Prevent duplicates
    const exists = await Payroll.findOne({ orgId, branchId, staffId, month });
    if (exists) throw new AppError('Payroll already exists for this staff member and month', 400);

    // Calculate absent deductions from StaffAttendance
    const [attendanceYear, attendanceMonth] = month.split('-');
    const startDate = new Date(parseInt(attendanceYear), parseInt(attendanceMonth) - 1, 1);
    const endDate = new Date(parseInt(attendanceYear), parseInt(attendanceMonth), 0);

    const staffAttendance = await StaffAttendance.find({
      orgId,
      branchId,
      staffId,
      date: { $gte: startDate, $lte: endDate },
      status: 'absent',
    }).lean();

    const absentDays = staffAttendance.length;
    const branchDoc = await Branch.findOne({ orgId, _id: branchId }).select('settings').lean();
    // Use count of configured working days * 4.33 weeks, defaulting to 26
    const configuredDays = branchDoc?.settings?.workingDays?.length;
    const workingDays = configuredDays ? Math.round(configuredDays * 4.33) : 26;
    const dailyRate = basicSalary / workingDays;
    const absentDeduction = Math.round(dailyRate * absentDays);

    const totalAllowances = (allowances as { amount: number }[]).reduce((sum, a) => sum + a.amount, 0);
    const totalDeductionItems = (deductions as { amount: number }[]).reduce((sum, d) => sum + d.amount, 0);
    const grossSalary = basicSalary + totalAllowances;
    const totalDeductions = totalDeductionItems + absentDeduction;
    const netPay = Math.max(0, grossSalary - totalDeductions);

    const payroll = await Payroll.create({
      orgId,
      branchId,
      staffId,
      month,
      basicSalary,
      allowances,
      deductions,
      absentDays,
      absentDeduction,
      grossSalary,
      totalDeductions,
      netPay,
      status: 'draft',
    });

    res.status(201).json({ success: true, data: payroll });
  } catch (err) { next(err); }
}

export async function updatePayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payroll = await Payroll.findOne({ _id: req.params['id'], orgId: req.orgId });
    if (!payroll) throw new AppError('Payroll record not found', 404);
    if (payroll.status !== 'draft') throw new AppError('Cannot edit an approved or paid payroll', 400);

    const { basicSalary, allowances, deductions } = req.body;
    if (basicSalary != null) payroll.basicSalary = basicSalary;
    if (allowances != null) payroll.allowances = allowances;
    if (deductions != null) payroll.deductions = deductions;

    const totalAllowances = payroll.allowances.reduce((sum, a) => sum + a.amount, 0);
    const totalDeductionItems = payroll.deductions.reduce((sum, d) => sum + d.amount, 0);
    payroll.grossSalary = payroll.basicSalary + totalAllowances;
    payroll.totalDeductions = totalDeductionItems + payroll.absentDeduction;
    payroll.netPay = Math.max(0, payroll.grossSalary - payroll.totalDeductions);

    await payroll.save();
    res.json({ success: true, data: payroll });
  } catch (err) { next(err); }
}

export async function approvePayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payroll = await Payroll.findOne({ _id: req.params['id'], orgId: req.orgId });
    if (!payroll) throw new AppError('Payroll record not found', 404);
    if (payroll.status !== 'draft') throw new AppError('Payroll is already approved or paid', 400);

    payroll.status = 'approved';
    payroll.approvedById = new Types.ObjectId(req.user!.id);
    payroll.approvedAt = new Date();
    await payroll.save();

    res.json({ success: true, data: payroll });
  } catch (err) { next(err); }
}

export async function markPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { paymentMethod } = req.body;
    const payroll = await Payroll.findOne({ _id: req.params['id'], orgId: req.orgId });
    if (!payroll) throw new AppError('Payroll record not found', 404);
    if (payroll.status !== 'approved') throw new AppError('Payroll must be approved before marking as paid', 400);

    payroll.status = 'paid';
    payroll.paidAt = new Date();
    payroll.paymentMethod = paymentMethod ?? 'bank_transfer';
    await payroll.save();

    res.json({ success: true, data: payroll });
  } catch (err) { next(err); }
}

export async function bulkProcessPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(422).json({ success: false, errors: errors.array() }); return; }

    const { month, staffIds } = req.body;
    if (!month) throw new AppError('month is required (YYYY-MM)', 400);

    const orgId = req.orgId;
    const branchId = req.user!.branchId;

    // Get all branch staff
    const staffFilter: Record<string, unknown> = {
      orgId: new Types.ObjectId(orgId!),
      branchId: new Types.ObjectId(branchId!),
      role: { $in: ['teacher', 'branch_principal', 'accountant', 'it_admin'] },
      active: true,
    };
    if (staffIds?.length) staffFilter['_id'] = { $in: staffIds };

    const User_ = User;
    const staff = await User_.find(staffFilter).select('_id').lean();

    let created = 0;
    let skipped = 0;

    for (const s of staff) {
      const exists = await Payroll.findOne({ orgId, branchId, staffId: s._id, month }).lean();
      if (exists) { skipped++; continue; }

      // Default salary — schools should set this per staff
      await Payroll.create({
        orgId,
        branchId,
        staffId: s._id,
        month,
        basicSalary: 0,
        allowances: [],
        deductions: [],
        absentDays: 0,
        absentDeduction: 0,
        grossSalary: 0,
        totalDeductions: 0,
        netPay: 0,
        status: 'draft',
      });
      created++;
    }

    res.status(201).json({ success: true, data: { created, skipped }, message: `Created ${created} payroll records` });
  } catch (err) { next(err); }
}

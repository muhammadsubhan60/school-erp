import { Request, Response, NextFunction } from 'express';
import { BranchHeader } from '../models/BranchHeader';

export async function getHeader(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const doc = await BranchHeader.findOne({ orgId: req.orgId, branchId: req.user!.branchId }).lean();
    res.json({ success: true, data: doc ?? null });
  } catch (err) { next(err); }
}

export async function saveHeader(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { schoolName, tagline, address, logoBase64, showStudentName, showRollNo, showSection } = req.body;

    const doc = await BranchHeader.findOneAndUpdate(
      { orgId: req.orgId, branchId: req.user!.branchId },
      { schoolName, tagline, address, logoBase64, showStudentName, showRollNo, showSection },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, data: doc });
  } catch (err) { next(err); }
}

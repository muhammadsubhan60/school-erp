import { Types } from 'mongoose';
import { Branch } from '../../models/Branch';
import { Student } from '../../models/Student';
import { FeeStructure } from '../../models/FeeStructure';
import { Challan } from '../../models/Challan';
import { Organization } from '../../models/Organization';

export async function generateMonthlyChallans(opts?: {
  orgId?: string;
  branchId?: string;
  month?: string;
  classId?: string;
}): Promise<{ created: number; skipped: number }> {
  const now = new Date();
  const targetDate = opts?.month
    ? new Date(`${opts.month}-01`)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const month = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

  let created = 0;
  let skipped = 0;

  const orgFilter: Record<string, unknown> = { status: 'active' };
  if (opts?.orgId) orgFilter._id = new Types.ObjectId(opts.orgId);
  const orgs = await Organization.find(orgFilter).lean();

  for (const org of orgs) {
    const branchFilter: Record<string, unknown> = { orgId: org._id, status: 'active' };
    if (opts?.branchId) branchFilter._id = new Types.ObjectId(opts.branchId);
    const branches = await Branch.find(branchFilter).lean();

    for (const branch of branches) {
      const studentQuery: Record<string, unknown> = { orgId: org._id, branchId: branch._id, status: 'active' };
      if (opts?.classId) studentQuery.classId = new Types.ObjectId(opts.classId);

      const [students, structures, existingChallans] = await Promise.all([
        Student.find(studentQuery).lean(),
        FeeStructure.find({ orgId: org._id, branchId: branch._id, isActive: true }).lean(),
        Challan.find({ orgId: org._id, branchId: branch._id, month }).select('studentId').lean(),
      ]);

      const existingSet = new Set(existingChallans.map(c => c.studentId.toString()));
      const structureMap = new Map(structures.map(s => [s.classId.toString(), s]));

      const dueDay = structures[0]?.dueDay ?? 10;
      const dueDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), dueDay);

      const toCreate = students
        .filter(s => !existingSet.has(s._id.toString()) && structureMap.has(s.classId.toString()))
        .map(s => {
          const structure = structureMap.get(s.classId.toString())!;
          const challanNo = `${String(org._id).slice(-4).toUpperCase()}-${String(branch._id).slice(-4).toUpperCase()}-${month}-${String(s._id).slice(-6).toUpperCase()}`;
          return {
            orgId: org._id,
            branchId: branch._id,
            studentId: s._id,
            classId: s.classId,
            feeStructureId: structure._id,
            month,
            challanNo,
            items: structure.items.map(i => ({ name: i.name, amount: i.amount })),
            totalAmount: structure.totalAmount,
            discount: 0,
            waiver: 0,
            netAmount: structure.totalAmount,
            paidAmount: 0,
            dueDate,
            status: 'unpaid',
            payments: [],
          };
        });

      skipped += students.length - toCreate.length;

      if (toCreate.length > 0) {
        await Challan.insertMany(toCreate, { ordered: false });
        created += toCreate.length;
      }
    }
  }

  console.log(`[ChallanJob] Generated ${created} challans for ${month}, skipped ${skipped}`);
  return { created, skipped };
}

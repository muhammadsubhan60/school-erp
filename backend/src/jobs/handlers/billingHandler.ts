import { Organization } from '../../models/Organization';
import { Attendance } from '../../models/Attendance';
import { UsageMetric } from '../../models/UsageMetric';
import { PlatformSettings } from '../../models/PlatformSettings';

const DEFAULT_PRICING: Record<string, { limit: number; rate: number }[]> = {
  starter: [{ limit: 150, rate: 50 }],
  growth: [{ limit: 150, rate: 50 }, { limit: 350, rate: 40 }],
  scale: [{ limit: 150, rate: 50 }, { limit: 350, rate: 40 }, { limit: 500, rate: 30 }],
};

function getRateForCount(tiers: { limit: number; rate: number }[], count: number): number {
  let rate = tiers[0].rate;
  for (const tier of tiers) {
    if (count <= tier.limit) { rate = tier.rate; break; }
  }
  return rate;
}

export async function countActiveStudents(): Promise<void> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Pull pricing from platform settings; fall back to defaults
  const settings = await PlatformSettings.findOne().lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pricingConfig = (settings as any)?.pricingTiers ?? DEFAULT_PRICING;

  // Single aggregation across all orgs/branches
  const results = await Attendance.aggregate([
    { $match: { date: { $gte: monthStart, $lte: monthEnd } } },
    { $unwind: '$records' },
    {
      $group: {
        _id: { orgId: '$orgId', branchId: '$branchId' },
        activeStudents: { $addToSet: '$records.studentId' },
      },
    },
    {
      $project: {
        orgId: '$_id.orgId',
        branchId: '$_id.branchId',
        activeCount: { $size: '$activeStudents' },
      },
    },
  ]);

  if (results.length === 0) {
    console.log(`[BillingJob] No attendance data for ${month}`);
    return;
  }

  // Fetch org plans for rate calculation
  const orgIds = [...new Set(results.map(r => r.orgId.toString()))];
  const orgs = await Organization.find({ _id: { $in: orgIds } }).select('plan').lean();
  const orgPlanMap = new Map(orgs.map(o => [o._id.toString(), o.plan]));

  const bulkOps = results.map(r => {
    const plan = orgPlanMap.get(r.orgId.toString()) ?? 'starter';
    const tiers = pricingConfig[plan] ?? pricingConfig.starter ?? DEFAULT_PRICING.starter;
    const rate = getRateForCount(tiers, r.activeCount);

    return {
      updateOne: {
        filter: { orgId: r.orgId, branchId: r.branchId, month },
        update: {
          $set: {
            orgId: r.orgId,
            branchId: r.branchId,
            month,
            activeStudents: r.activeCount,
            plan,
            ratePerStudent: rate,
            totalAmount: r.activeCount * rate,
            generatedAt: new Date(),
          },
        },
        upsert: true,
      },
    };
  });

  await UsageMetric.bulkWrite(bulkOps);

  // Update org-level billing timestamps in one go
  await Organization.updateMany(
    { _id: { $in: orgIds } },
    { 'usageBilling.lastCountedAt': new Date() }
  );

  console.log(`[BillingJob] Active student count completed for ${month} — ${results.length} branch(es) updated`);
}

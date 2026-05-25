import { Agenda, Job } from 'agenda';
import { MongoBackend } from '@agendajs/mongo-backend';
import { env } from '../config/env';

const agenda = new Agenda({
  backend: new MongoBackend({ address: env.mongoUri, collection: 'agendaJobs' }),
  processEvery: '1 minute',
  defaultLockLifetime: 10 * 60 * 1000,
});

agenda.on('error', (err: Error) => console.error('[Agenda] connection error:', err));

agenda.define('count-active-students', async () => {
  const { countActiveStudents } = await import('./handlers/billingHandler');
  await countActiveStudents();
});

agenda.define('generate-monthly-challans', async () => {
  const { generateMonthlyChallans } = await import('./handlers/challanHandler');
  await generateMonthlyChallans();
});

agenda.define('generate-challans-manual', async (job: Job) => {
  const { generateMonthlyChallans } = await import('./handlers/challanHandler');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = job.attrs.data as any;
  await generateMonthlyChallans({ orgId: data.orgId, branchId: data.branchId, month: data.month, classId: data.classId });
});

agenda.define('process-payroll', async (job: Job) => {
  const { processPayroll } = await import('./handlers/payrollHandler');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await processPayroll(job.attrs.data as any);
});

agenda.define('generate-weak-report', async () => {
  const { generateMonthlyWeakReport } = await import('./handlers/weakReportHandler');
  await generateMonthlyWeakReport();
});

export async function scheduleRecurringJobs(): Promise<void> {
  await agenda.start();

  // Count active students on 1st of every month at midnight PKT (UTC+5 = 19:00 UTC prev day)
  await agenda.every('0 19 1 * *', 'count-active-students', {}, { skipImmediate: true });

  // Auto-generate challans on 25th of each month for next month
  await agenda.every('0 0 25 * *', 'generate-monthly-challans', {}, { skipImmediate: true });

  // Generate monthly weak report on 1st of each month at 01:00 PKT (20:00 UTC)
  await agenda.every('0 20 1 * *', 'generate-weak-report', {}, { skipImmediate: true });

  console.log('[Agenda] recurring jobs scheduled');
}

/** Dispatch a one-off payroll processing job. */
export async function dispatchPayrollJob(data: Record<string, unknown>): Promise<void> {
  await agenda.now('process-payroll', data);
}

/** Dispatch a one-off challan generation job (HTTP-triggered). */
export async function dispatchChallanJob(data: Record<string, unknown>): Promise<void> {
  await agenda.now('generate-challans-manual', data);
}

export async function stopAgenda(): Promise<void> {
  await agenda.stop();
}

export { agenda };

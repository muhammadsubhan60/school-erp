import 'dotenv/config';
import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { initSocket } from './socket';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  const { scheduleRecurringJobs, stopAgenda } = await import('./jobs');
  await scheduleRecurringJobs();

  httpServer.listen(env.port, () => {
    console.log(`EduStack PK API running on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down...`);
    await stopAgenda();
    httpServer.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});

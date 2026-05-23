import { createServer } from 'http';
import Database from 'better-sqlite3';
import { createApp } from './app.js';
import { createWs } from './ws.js';
import { probeQueue, recordQueue, createProbeWorker } from './queue.js';
import { runProbe } from './probe.worker.js';
import { executeRecording } from './recording.worker.js';
import { startHealthDaemon, stopHealthDaemon } from './health.daemon.js';
import { logger } from './logger.js';

const PORT = parseInt(process.env.PORT || '4000', 10);

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

const dbPath = process.env.SQLITE_PATH || './data/auth.db';
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const { app, channelService } = createApp({
  db,
  enableAuth: true,
});

const httpServer = createServer(app);
createWs(httpServer);

const probeWorker = await createProbeWorker(async (jobId, channelId) => {
  await runProbe(jobId, channelId, channelService);
});

startHealthDaemon();

httpServer.listen(PORT, () => {
  logger.info('ias-pv API listening', { port: PORT });
});

async function shutdown(signal: string) {
  logger.info('Shutting down', { signal });
  stopHealthDaemon();
  await probeWorker.close();
  await probeQueue.close();
  await recordQueue.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

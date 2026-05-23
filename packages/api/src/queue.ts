import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380';

export const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

export const probeQueue = new Queue('probe', { connection });
export const probeQueueEvents = new QueueEvents('probe', { connection });

export const recordQueue = new Queue('record', { connection });
export const recordQueueEvents = new QueueEvents('record', { connection });

export async function createProbeWorker(
  handler: (jobId: string, channelId: string) => Promise<void>,
) {
  const worker = new Worker(
    'probe',
    async (job) => {
      const { channelId } = job.data as { channelId: string };
      await handler(job.id!, channelId);
    },
    { connection, concurrency: parseInt(process.env.PROBE_CONCURRENCY || '50', 10) },
  );
  return worker;
}

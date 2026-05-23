import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createChannelRouter } from './channel.routes.js';
import { ChannelService } from './channel.service.js';
import { RecordingService } from './recording.service.js';
import { createRecordingRouter } from './recording.routes.js';
import { createSwaggerRouter } from './swagger.js';
import { createWs } from './ws.js';
import { probeQueue, recordQueue, createProbeWorker } from './queue.js';
import { runProbe } from './probe.worker.js';
import { executeRecording } from './recording.worker.js';
import { startHealthDaemon, stopHealthDaemon } from './health.daemon.js';
import { logger } from './logger.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const OUTPUT_DIR = process.env.OUTPUT_DIR || './recordings';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
createWs(httpServer);

const channelService = new ChannelService();
const recordingService = new RecordingService();

app.use('/api/docs', createSwaggerRouter());
app.use('/api/channels', createChannelRouter(channelService));

app.post('/api/channels/:id/probe', async (req, res) => {
  const channel = channelService.getById(req.params.id);
  if (!channel) {
    res.status(404).json({ error: 'Channel not found' });
    return;
  }
  const job = await probeQueue.add('probe', { channelId: channel.id });
  res.status(202).json({ jobId: job.id });
});

app.use('/api/recordings', createRecordingRouter(
  recordingService,
  channelService,
  OUTPUT_DIR,
));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    channels: channelService.list().length,
    recordings: recordingService.list().length,
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

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
  // Force exit after 10s
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

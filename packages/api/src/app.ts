import express, { type Express } from 'express';
import cors from 'cors';
import { createChannelRouter } from './channel.routes.js';
import { ChannelService } from './channel.service.js';
import { RecordingService } from './recording.service.js';
import { createRecordingRouter } from './recording.routes.js';
import { createSwaggerRouter } from './swagger.js';

export function createApp(): { app: Express; channelService: ChannelService; recordingService: RecordingService } {
  const app = express();
  app.use(cors());
  app.use(express.json());

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
    res.status(202).json({ jobId: 'mock-job-id' });
  });

  app.use('/api/recordings', createRecordingRouter(
    recordingService,
    channelService,
    process.env.OUTPUT_DIR || './recordings',
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

  return { app, channelService, recordingService };
}

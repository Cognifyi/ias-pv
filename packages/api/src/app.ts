import express, { type Express } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { createChannelRouter } from './channel.routes.js';
import { ChannelService } from './channel.service.js';
import { RecordingService } from './recording.service.js';
import { createRecordingRouter } from './recording.routes.js';
import { createSwaggerRouter } from './swagger.js';
import { UserService } from './auth/user.service.js';
import { createAuthRouter } from './auth/auth.routes.js';
import { requireAuth } from './auth/auth.middleware.js';
import type { AuthUser } from './auth/auth.middleware.js';

export interface AppOptions {
  db?: Database.Database;
  userService?: UserService;
  enableAuth?: boolean;
}

export function createApp(options?: AppOptions): {
  app: Express;
  channelService: ChannelService;
  recordingService: RecordingService;
  userService?: UserService;
} {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const channelService = new ChannelService();
  const recordingService = new RecordingService();

  app.use('/api/docs', createSwaggerRouter());

  if (options?.enableAuth && (options?.userService || options?.db)) {
    const db = options.db || new Database(':memory:');
    const userService = options.userService || new UserService(db);
    userService.init();
    app.use('/api/auth', createAuthRouter(userService));

    app.use('/api/channels', requireAuth, createChannelRouter(channelService));

    app.post('/api/channels/:id/probe', requireAuth, async (req, res) => {
      const channel = channelService.getById(req.params.id as string);
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }
      res.status(202).json({ jobId: 'mock-job-id' });
    });

    app.use('/api/recordings', requireAuth, createRecordingRouter(
      recordingService,
      channelService,
      process.env.OUTPUT_DIR || './recordings',
    ));

    app.get('/api/health', requireAuth, (_req, res) => {
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

    return { app, channelService, recordingService, userService };
  }

  app.use('/api/channels', createChannelRouter(channelService));

  app.post('/api/channels/:id/probe', async (req, res) => {
      const channel = channelService.getById(req.params.id as string);
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

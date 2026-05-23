import { Router, Request, Response } from 'express';
import { RecordingService } from './recording.service.js';
import { ChannelService } from './channel.service.js';
import { recordQueue } from './queue.js';
import { executeRecording, cancelRecording } from './recording.worker.js';
import type { RequestHandler } from 'express';

type IdParams = { id: string };

export function createRecordingRouter(
  recordingService: RecordingService,
  channelService: ChannelService,
  outputDir: string,
  adminMiddleware?: RequestHandler,
): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json(recordingService.list());
  });

  router.get('/:id', (req: Request<IdParams>, res: Response) => {
    const recording = recordingService.getById(req.params.id);
    if (!recording) {
      res.status(404).json({ error: 'Recording not found' });
      return;
    }
    res.json(recording);
  });

  const adminHandlers = adminMiddleware ? [adminMiddleware] : [];

  router.post('/', ...adminHandlers, async (req: Request, res: Response) => {
    try {
      const { channelId, cronExpression, duration, maxRetries } = req.body;
      const channel = channelService.getById(channelId);
      if (!channel) {
        res.status(400).json({ error: 'Channel not found' });
        return;
      }

      const channelOutputDir = channel.metadata?.outputPath || outputDir;

      const recording = recordingService.create(
        { channelId, cronExpression, duration, maxRetries },
        channel.name,
      );

      await recordQueue.add(
        'record',
        { recordingId: recording.id, url: channel.url, outputDir: channelOutputDir },
      );

      res.status(201).json(recording);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Validation error';
      res.status(400).json({ error: message });
    }
  });

  router.delete('/:id', ...adminHandlers, (req: Request<IdParams>, res: Response) => {
    const recording = recordingService.getById(req.params.id);
    if (!recording) {
      res.status(404).json({ error: 'Recording not found' });
      return;
    }

    if (recording.status === 'recording') {
      cancelRecording(req.params.id, recordingService);
    } else {
      recordingService.updateStatus(req.params.id, 'failed', {
        lastError: 'Cancelled by user',
      });
    }

    res.status(204).send();
  });

  return router;
}

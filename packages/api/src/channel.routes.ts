import { Router, Request, Response } from 'express';
import { ChannelService } from './channel.service.js';
import type { CreateChannelInput } from '@ias-pv/shared';
import type { RequestHandler } from 'express';

type IdParams = { id: string };

export function createChannelRouter(
  service: ChannelService,
  adminMiddleware?: RequestHandler,
): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json(service.list());
  });

  router.get('/:id', (req: Request<IdParams>, res: Response) => {
    const channel = service.getById(req.params.id);
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    res.json(channel);
  });

  const adminHandlers = adminMiddleware ? [adminMiddleware] : [];

  router.post('/', ...adminHandlers, (req: Request, res: Response) => {
    try {
      const input = req.body as CreateChannelInput;
      const channel = service.create(input);
      res.status(201).json(channel);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Validation error';
      res.status(400).json({ error: message });
    }
  });

  router.put('/:id', ...adminHandlers, (req: Request<IdParams>, res: Response) => {
    try {
      const channel = service.update(req.params.id, req.body);
      if (!channel) {
        res.status(404).json({ error: 'Channel not found' });
        return;
      }
      res.json(channel);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Validation error';
      res.status(400).json({ error: message });
    }
  });

  router.delete('/:id', ...adminHandlers, (req: Request<IdParams>, res: Response) => {
    const deleted = service.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    res.status(204).send();
  });

  return router;
}

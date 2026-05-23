import { describe, it, expect, beforeEach } from 'vitest';
import { RecordingService } from '../src/recording.service.js';

describe('RecordingService', () => {
  let service: RecordingService;

  beforeEach(() => {
    service = new RecordingService();
  });

  it('creates a recording and returns it with id and timestamps', () => {
    const rec = service.create(
      { channelId: 'ch-1', cronExpression: '0 * * * *', duration: 60 },
      'BBC World News',
    );

    expect(rec.id).toBeDefined();
    expect(rec.channelId).toBe('ch-1');
    expect(rec.channelName).toBe('BBC World News');
    expect(rec.cronExpression).toBe('0 * * * *');
    expect(rec.duration).toBe(60);
    expect(rec.status).toBe('pending');
    expect(rec.retryCount).toBe(0);
    expect(rec.maxRetries).toBe(3);
  });

  it('lists all recordings', () => {
    service.create({ channelId: 'ch-1', cronExpression: '0 * * * *', duration: 30 }, 'Ch1');
    service.create({ channelId: 'ch-2', cronExpression: '30 * * * *', duration: 60 }, 'Ch2');

    expect(service.list()).toHaveLength(2);
  });

  it('updates recording status', () => {
    const rec = service.create({ channelId: 'ch-1', cronExpression: '0 * * * *', duration: 30 }, 'Ch1');
    const updated = service.updateStatus(rec.id, 'recording');
    expect(updated?.status).toBe('recording');
  });

  it('returns undefined for non-existent id on update', () => {
    expect(service.updateStatus('nope', 'done')).toBeUndefined();
  });

  it('increments retry count', () => {
    const rec = service.create({ channelId: 'ch-1', cronExpression: '0 * * * *', duration: 30 }, 'Ch1');
    service.updateStatus(rec.id, 'recording');
    const updated = service.incrementRetry(rec.id, 'Connection lost');
    expect(updated?.retryCount).toBe(1);
    expect(updated?.lastError).toBe('Connection lost');
    expect(updated?.status).toBe('pending');
  });

  it('deletes a recording', () => {
    const rec = service.create({ channelId: 'ch-1', cronExpression: '0 * * * *', duration: 30 }, 'Ch1');
    expect(service.delete(rec.id)).toBe(true);
    expect(service.getById(rec.id)).toBeUndefined();
  });

  it('validates required fields on create', () => {
    expect(() =>
      service.create({ channelId: '', cronExpression: '0 * * * *', duration: 30 }, 'Ch1'),
    ).toThrow('channelId is required');

    expect(() =>
      service.create({ channelId: 'ch-1', cronExpression: '', duration: 30 }, 'Ch1'),
    ).toThrow('cronExpression is required');

    expect(() =>
      service.create({ channelId: 'ch-1', cronExpression: '0 * * * *', duration: 0 }, 'Ch1'),
    ).toThrow('duration must be positive');
  });
});

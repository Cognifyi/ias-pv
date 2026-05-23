import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildFfmpegArgs } from '../src/recording.worker.js';
import { RecordingService } from '../src/recording.service.js';

// Mock WebSocket
vi.mock('../src/ws.js', () => ({
  getWs: () => ({
    emit: vi.fn(),
  }),
}));

describe('recording.worker', () => {
  describe('buildFfmpegArgs', () => {
    it('returns safe argument array', () => {
      const args = buildFfmpegArgs('https://example.com/stream.m3u8', 3600, '/out/recording.ts');
      expect(args).toEqual([
        '-y',
        '-i', 'https://example.com/stream.m3u8',
        '-t', '3600',
        '-c', 'copy',
        '/out/recording.ts',
      ]);
    });

    it('avoids shell injection via special characters', () => {
      const args = buildFfmpegArgs('https://bad.com/$(rm -rf /).m3u8', 60, '/out/test.ts');
      // Arguments are separate array elements — no shell interpretation
      expect(args[2]).toBe('https://bad.com/$(rm -rf /).m3u8');
    });
  });

  describe('RecordingService cancel flow', () => {
    let service: RecordingService;

    beforeEach(() => {
      service = new RecordingService();
    });

    it('cancels a pending recording via status update', () => {
      const rec = service.create(
        { channelId: 'ch-1', cronExpression: '0 * * * *', duration: 30 },
        'Test',
      );
      const updated = service.updateStatus(rec.id, 'failed', { lastError: 'Cancelled by user' });
      expect(updated?.status).toBe('failed');
      expect(updated?.lastError).toBe('Cancelled by user');
    });
  });
});

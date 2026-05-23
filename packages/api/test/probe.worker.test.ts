import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runProbe } from '../src/probe.worker.js';
import { ChannelService } from '../src/channel.service.js';

// Mock WebSocket
vi.mock('../src/ws.js', () => ({
  getWs: () => ({
    emit: vi.fn(),
  }),
}));

describe('runProbe', () => {
  let channelService: ChannelService;

  beforeEach(() => {
    channelService = new ChannelService();
  });

  it('returns unreachable for non-existent channel', async () => {
    const result = await runProbe('job-1', 'nope', channelService);
    expect(result.reachable).toBe(false);
    expect(result.error).toBe('Channel not found');
  });

  it('returns reachable when HEAD succeeds and ffprobe returns metadata', async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const channel = channelService.create({
      name: 'Test',
      url: 'https://example.com/stream.m3u8',
      group: 'News',
    });

    const result = await runProbe('job-1', channel.id, channelService);

    expect(result.reachable).toBe(true);
    expect(result.latency).toBeGreaterThanOrEqual(0);

    // Channel should be marked online
    const updated = channelService.getById(channel.id);
    expect(updated?.status).toBe('online');

    globalThis.fetch = globalFetch;
  });
});

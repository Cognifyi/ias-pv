import { describe, it, expect, vi } from 'vitest';
import { logger } from '../src/logger.js';

describe('logger', () => {
  it('logs info messages as JSON', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('test message', { recordingId: 'abc' });
    expect(spy).toHaveBeenCalledOnce();
    const call = spy.mock.calls[0][0];
    const parsed = JSON.parse(call);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test message');
    expect(parsed.recordingId).toBe('abc');
    spy.mockRestore();
  });

  it('logs error messages to stderr', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('something broke', { channelId: 'ch-1' });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});

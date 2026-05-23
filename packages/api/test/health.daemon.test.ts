import { describe, it, expect } from 'vitest';
import { startHealthDaemon, stopHealthDaemon } from '../src/health.daemon.js';

describe('health daemon', () => {
  it('starts and stops without error', () => {
    startHealthDaemon();
    stopHealthDaemon();
    expect(true).toBe(true);
  });
});

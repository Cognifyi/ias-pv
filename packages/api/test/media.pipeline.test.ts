import { describe, it, expect } from 'vitest';
import { runMediaPipeline } from '../src/media.pipeline.js';

describe('media pipeline', () => {
  it('throws for non-existent input file', async () => {
    await expect(
      runMediaPipeline('/tmp/nonexistent.ts', '/tmp/pipeline-test'),
    ).rejects.toThrow();
  }, 10_000);
});

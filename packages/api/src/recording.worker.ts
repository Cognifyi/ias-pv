import { spawn, ChildProcess } from 'node:child_process';
import { access } from 'node:fs/promises';
import { getWs } from './ws.js';
import { RecordingService } from './recording.service.js';
import { recordQueue } from './queue.js';
import { logger } from './logger.js';

const activeProcesses = new Map<string, ChildProcess>();

export type RecordingResult = {
  recordingId: string;
  success: boolean;
  outputPath?: string;
  error?: string;
};

export async function executeRecording(
  recordingId: string,
  url: string,
  outputDir: string,
  recordingService: RecordingService,
): Promise<RecordingResult> {
  recordingService.updateStatus(recordingId, 'recording');

  const io = getWs();
  const emit = (data: Record<string, unknown>) =>
    io.emit('recording:progress', { recordingId, ...data });

  const recording = recordingService.getById(recordingId);
  if (!recording) {
    return { recordingId, success: false, error: 'Recording not found' };
  }

  // Configure output path
  const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
  const outputPath = `${outputDir}/${sanitizedUrl}_${Date.now()}.ts`;

  // Duration in seconds
  const durationSec = recording.duration * 60;

  // Spawn FFmpeg with argument array — no shell injection
  const args = [
    '-y',
    '-i', url,
    '-t', String(durationSec),
    '-c', 'copy',
    outputPath,
  ];

  const proc = spawn('ffmpeg', args, { timeout: (durationSec + 60) * 1000 });
  activeProcesses.set(recordingId, proc);

  proc.stderr?.on('data', (data: Buffer) => {
    const line = data.toString();
    // Parse time for progress reporting
    const timeMatch = line.match(/time=(\d+):(\d+):(\d+\.\d+)/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const secs = parseFloat(timeMatch[3]);
      const elapsed = hours * 3600 + minutes * 60 + secs;
      const progress = Math.min(1, elapsed / durationSec);
      emit({ progress, elapsed });
    }
  });

  return new Promise((resolve) => {
    proc.on('close', async (code) => {
      activeProcesses.delete(recordingId);

      if (code === 0) {
        // Silent crash detection: verify output file exists
        try {
          await access(outputPath);
        } catch {
          logger.error('FFmpeg exited 0 but output file missing', { recordingId, outputPath });
          code = -1;
        }
      }

      if (code === 0) {
        recordingService.updateStatus(recordingId, 'done', { outputPath });
        io.emit('recording:done', { recordingId, outputPath });
        logger.info('Recording completed', { recordingId, outputPath });
        resolve({ recordingId, success: true, outputPath });
      } else {
        const rec = recordingService.getById(recordingId);
        const error = `FFmpeg exited with code ${code}`;

        if (rec && rec.retryCount < rec.maxRetries) {
          recordingService.incrementRetry(recordingId, error);
          // Re-enqueue with exponential backoff
          const delay = Math.pow(2, rec.retryCount) * 30_000;
          await recordQueue.add(
            'record',
            { recordingId, url, outputDir },
            { delay },
          );
          io.emit('recording:retrying', { recordingId, retryCount: rec.retryCount + 1, delay });
        } else {
          recordingService.updateStatus(recordingId, 'failed', { lastError: error });
          io.emit('recording:failed', { recordingId, error });
        }

        resolve({ recordingId, success: false, error });
      }
    });

    proc.on('error', (err) => {
      activeProcesses.delete(recordingId);
      const error = err.message;
      recordingService.updateStatus(recordingId, 'failed', { lastError: error });
      io.emit('recording:failed', { recordingId, error });
      resolve({ recordingId, success: false, error });
    });
  });
}

export function cancelRecording(recordingId: string, recordingService: RecordingService): boolean {
  const proc = activeProcesses.get(recordingId);
  if (proc) {
    proc.kill('SIGTERM');
    activeProcesses.delete(recordingId);
  }
  const updated = recordingService.updateStatus(recordingId, 'failed', {
    lastError: 'Cancelled by user',
  });
  return !!updated;
}

export function getActiveProcesses(): Map<string, ChildProcess> {
  return activeProcesses;
}

export function buildFfmpegArgs(url: string, durationSec: number, outputPath: string): string[] {
  return [
    '-y',
    '-i', url,
    '-t', String(durationSec),
    '-c', 'copy',
    outputPath,
  ];
}

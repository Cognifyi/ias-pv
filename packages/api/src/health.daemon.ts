import { access } from 'node:fs/promises';
import { getActiveProcesses } from './recording.worker.js';

const CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10);
const PROCESS_TIMEOUT = parseInt(process.env.PROCESS_TIMEOUT || '3600000', 10); // 1h

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startHealthDaemon(): void {
  if (intervalHandle) return;

  intervalHandle = setInterval(() => {
    const activeProcesses = getActiveProcesses();
    const now = Date.now();

    for (const [recordingId, proc] of activeProcesses) {
      if (!proc.pid) continue;

      try {
        // Check if process is still running via kill(0)
        const stillRunning = proc.exitCode === null;
        if (!stillRunning) {
          activeProcesses.delete(recordingId);
          continue;
        }

        // Check if process has exceeded timeout
        if (proc.pid && hasExceededTimeout(proc, now)) {
          console.warn(`[health] Killing timed-out FFmpeg process (pid=${proc.pid}) for recording ${recordingId}`);
          proc.kill('SIGKILL');
          activeProcesses.delete(recordingId);
        }
      } catch {
        activeProcesses.delete(recordingId);
      }
    }
  }, CHECK_INTERVAL);
}

export function stopHealthDaemon(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

function hasExceededTimeout(proc: import('child_process').ChildProcess, now: number): boolean {
  // Use spawn args (recorded start time) — simple heuristic
  const startedAt = (proc as unknown as { startTime?: number }).startTime;
  if (!startedAt) return false;
  return (now - startedAt) > PROCESS_TIMEOUT;
}

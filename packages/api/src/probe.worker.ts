import { spawn } from 'node:child_process';
import { getWs } from './ws.js';
import { ChannelService } from './channel.service.js';

export type ProbeResult = {
  channelId: string;
  reachable: boolean;
  latency?: number;
  resolution?: string;
  error?: string;
};

export async function runProbe(
  _jobId: string,
  channelId: string,
  channelService: ChannelService,
): Promise<ProbeResult> {
  const channel = channelService.getById(channelId);
  if (!channel) {
    return { channelId, reachable: false, error: 'Channel not found' };
  }

  const io = getWs();
  const emit = (data: Partial<ProbeResult>) =>
    io.emit('probe:progress', { channelId, ...data });

  emit({ reachable: false, latency: undefined });

  // Stage 1: HTTP HEAD check
  const headResult = await httpHead(channel.url);
  if (!headResult.ok) {
    channelService.update(channelId, { status: 'offline' });
    const result: ProbeResult = { channelId, reachable: false, error: headResult.error };
    io.emit('probe:complete', result);
    return result;
  }
  emit({ reachable: true, latency: headResult.latency });

  // Stage 2: ffprobe for stream metadata
  const ffprobeResult = await getStreamMetadata(channel.url);
  if (ffprobeResult) {
    emit({ resolution: ffprobeResult.resolution });
    channelService.update(channelId, {
      status: 'online',
      metadata: {
        resolution: ffprobeResult.resolution,
        bitrate: ffprobeResult.bitrate,
        latency: headResult.latency,
      },
    });
  } else {
    // ffprobe might fail for some streams, mark online anyway if HEAD succeeded
    channelService.update(channelId, { status: 'online' });
  }

  const result: ProbeResult = {
    channelId,
    reachable: true,
    latency: headResult.latency,
    resolution: ffprobeResult?.resolution,
  };
  io.emit('probe:complete', result);
  return result;
}

async function httpHead(url: string): Promise<{ ok: boolean; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    const latency = Date.now() - start;
    if (res.ok) return { ok: true, latency };
    return { ok: false, latency, error: `HTTP ${res.status}` };
  } catch (e: unknown) {
    const latency = Date.now() - start;
    const error = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, latency, error };
  }
}

type FfprobeMetadata = {
  resolution?: string;
  bitrate?: number;
};

async function getStreamMetadata(url: string): Promise<FfprobeMetadata | null> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      '-i', url,
    ], { timeout: 15_000 });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find(
          (s: { codec_type: string }) => s.codec_type === 'video',
        );
        const resolution = videoStream
          ? `${videoStream.width}x${videoStream.height}`
          : undefined;
        const bitrate = data.format?.bit_rate
          ? parseInt(data.format.bit_rate, 10)
          : undefined;
        resolve({ resolution, bitrate });
      } catch {
        resolve(null);
      }
    });

    proc.on('error', () => resolve(null));
  });
}

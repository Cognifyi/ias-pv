import { spawn } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';

export type PipelineResult = {
  segments: string[];
  thumbnail?: string;
  metadata?: StreamMetadata;
};

export type StreamMetadata = {
  codec?: string;
  resolution?: string;
  bitrate?: number;
  duration?: number;
};

export async function runMediaPipeline(
  inputPath: string,
  outputDir: string,
): Promise<PipelineResult> {
  await mkdir(outputDir, { recursive: true });

  const [segments, thumbnail, metadata] = await Promise.all([
    transcodeToHls(inputPath, outputDir),
    extractThumbnail(inputPath, outputDir),
    extractMetadata(inputPath),
  ]);

  return { segments, thumbnail, metadata };
}

async function transcodeToHls(inputPath: string, outputDir: string): Promise<string[]> {
  const outputPattern = `${outputDir}/segment_%03d.ts`;
  const playlistPath = `${outputDir}/index.m3u8`;

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-hls_time', '10',
      '-hls_list_size', '0',
      '-hls_segment_filename', outputPattern,
      playlistPath,
    ], { timeout: 300_000 });

    proc.on('close', async (code) => {
      if (code === 0) {
        try {
          await access(playlistPath);
          resolve([playlistPath]);
        } catch {
          reject(new Error('HLS output not found'));
        }
      } else {
        reject(new Error(`FFmpeg HLS transcode exited with code ${code}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

async function extractThumbnail(inputPath: string, outputDir: string): Promise<string | undefined> {
  const thumbPath = `${outputDir}/thumbnail.jpg`;

  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-vframes', '1',
      '-vf', 'thumbnail',
      '-q:v', '2',
      thumbPath,
    ], { timeout: 30_000 });

    proc.on('close', async (code) => {
      if (code === 0) {
        try {
          await access(thumbPath);
          resolve(thumbPath);
        } catch {
          resolve(undefined);
        }
      } else {
        resolve(undefined);
      }
    });

    proc.on('error', () => resolve(undefined));
  });
}

async function extractMetadata(inputPath: string): Promise<StreamMetadata | undefined> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      '-i', inputPath,
    ], { timeout: 15_000 });

    let stdout = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) { resolve(undefined); return; }
      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find(
          (s: { codec_type: string }) => s.codec_type === 'video',
        );
        const audioStream = data.streams?.find(
          (s: { codec_type: string }) => s.codec_type === 'audio',
        );
        resolve({
          codec: videoStream?.codec_name || audioStream?.codec_name,
          resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
          bitrate: data.format?.bit_rate ? parseInt(data.format.bit_rate, 10) : undefined,
          duration: data.format?.duration ? parseFloat(data.format.duration) : undefined,
        });
      } catch {
        resolve(undefined);
      }
    });

    proc.on('error', () => resolve(undefined));
  });
}

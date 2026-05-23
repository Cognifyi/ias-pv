import {
  Recording,
  CreateRecordingInput,
  RecordingStatus,
  generateId,
} from '@ias-pv/shared';

export class RecordingService {
  private recordings = new Map<string, Recording>();

  create(input: CreateRecordingInput, channelName: string): Recording {
    if (!input.channelId) throw new Error('channelId is required');
    if (!input.cronExpression) throw new Error('cronExpression is required');
    if (!input.duration || input.duration <= 0) throw new Error('duration must be positive');

    const now = new Date();
    const recording: Recording = {
      id: generateId(),
      channelId: input.channelId,
      channelName,
      cronExpression: input.cronExpression,
      duration: input.duration,
      status: 'pending',
      retryCount: 0,
      maxRetries: input.maxRetries ?? 3,
      scheduledAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.recordings.set(recording.id, recording);
    return recording;
  }

  list(): Recording[] {
    return Array.from(this.recordings.values());
  }

  getById(id: string): Recording | undefined {
    return this.recordings.get(id);
  }

  updateStatus(id: string, status: RecordingStatus, extra?: Partial<Recording>): Recording | undefined {
    const existing = this.recordings.get(id);
    if (!existing) return undefined;
    const updated: Recording = {
      ...existing,
      ...extra,
      status,
      updatedAt: new Date(),
    };
    this.recordings.set(id, updated);
    return updated;
  }

  incrementRetry(id: string, error?: string): Recording | undefined {
    const existing = this.recordings.get(id);
    if (!existing) return undefined;
    const updated: Recording = {
      ...existing,
      retryCount: existing.retryCount + 1,
      lastError: error,
      status: 'pending',
      updatedAt: new Date(),
    };
    this.recordings.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.recordings.delete(id);
  }
}

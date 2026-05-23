export type RecordingStatus =
  | 'pending'
  | 'recording'
  | 'transcoding'
  | 'done'
  | 'failed';

export interface Recording {
  id: string;
  channelId: string;
  channelName: string;
  cronExpression: string;
  duration: number;
  status: RecordingStatus;
  outputPath?: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  scheduledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateRecordingInput = {
  channelId: string;
  cronExpression: string;
  duration: number;
  maxRetries?: number;
};

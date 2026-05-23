export interface Channel {
  id: string;
  name: string;
  url: string;
  group: string;
  status: 'unknown' | 'online' | 'offline';
  metadata?: {
    resolution?: string;
    bitrate?: number;
    latency?: number;
    outputPath?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type CreateChannelInput = {
  name: string;
  url: string;
  group: string;
};

export type UpdateChannelInput = Partial<Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>>;

export type ChannelStatus = Channel['status'];

import { Channel, CreateChannelInput, UpdateChannelInput, generateId } from '@ias-pv/shared';

export class ChannelService {
  private channels = new Map<string, Channel>();

  create(input: CreateChannelInput): Channel {
    if (!input.name || input.name.trim() === '') {
      throw new Error('Name is required');
    }
    if (!input.url.startsWith('http://') && !input.url.startsWith('https://')) {
      throw new Error('Invalid URL');
    }

    const now = new Date();
    const channel: Channel = {
      id: generateId(),
      name: input.name.trim(),
      url: input.url.trim(),
      group: input.group.trim(),
      status: 'unknown',
      createdAt: now,
      updatedAt: now,
    };
    this.channels.set(channel.id, channel);
    return channel;
  }

  list(): Channel[] {
    return Array.from(this.channels.values());
  }

  getById(id: string): Channel | undefined {
    return this.channels.get(id);
  }

  update(id: string, input: UpdateChannelInput): Channel | undefined {
    const existing = this.channels.get(id);
    if (!existing) return undefined;

    const updated: Channel = {
      ...existing,
      ...input,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.url !== undefined && { url: input.url.trim() }),
      ...(input.group !== undefined && { group: input.group.trim() }),
      updatedAt: new Date(),
    };
    this.channels.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.channels.delete(id);
  }
}

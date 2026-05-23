import { describe, it, expect } from 'vitest';
import { ChannelService } from '../src/channel.service.js';
import type { CreateChannelInput } from '@ias-pv/shared';

describe('ChannelService', () => {
  const validInput: CreateChannelInput = {
    name: 'BBC World News',
    url: 'https://example.com/bbc.m3u8',
    group: 'News',
  };

  it('creates a channel and returns it with id and timestamps', () => {
    const service = new ChannelService();
    const channel = service.create(validInput);

    expect(channel.id).toBeDefined();
    expect(channel.name).toBe('BBC World News');
    expect(channel.url).toBe('https://example.com/bbc.m3u8');
    expect(channel.group).toBe('News');
    expect(channel.status).toBe('unknown');
    expect(channel.createdAt).toBeInstanceOf(Date);
    expect(channel.updatedAt).toBeInstanceOf(Date);
  });

  it('lists all channels', () => {
    const service = new ChannelService();
    service.create(validInput);
    service.create({ name: 'CNN', url: 'https://example.com/cnn.m3u8', group: 'News' });

    const channels = service.list();
    expect(channels).toHaveLength(2);
  });

  it('returns a channel by id', () => {
    const service = new ChannelService();
    const created = service.create(validInput);

    const found = service.getById(created.id);
    expect(found).toEqual(created);
  });

  it('returns undefined for non-existent id', () => {
    const service = new ChannelService();
    expect(service.getById('non-existent')).toBeUndefined();
  });

  it('updates a channel', () => {
    const service = new ChannelService();
    const created = service.create(validInput);

    const updated = service.update(created.id, { name: 'BBC World News HD' });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe('BBC World News HD');
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
  });

  it('returns undefined when updating non-existent channel', () => {
    const service = new ChannelService();
    expect(service.update('nope', { name: 'x' })).toBeUndefined();
  });

  it('deletes a channel', () => {
    const service = new ChannelService();
    const created = service.create(validInput);

    const deleted = service.delete(created.id);
    expect(deleted).toBe(true);
    expect(service.getById(created.id)).toBeUndefined();
  });

  it('returns false when deleting non-existent channel', () => {
    const service = new ChannelService();
    expect(service.delete('nope')).toBe(false);
  });

  it('validates URL must start with http/https', () => {
    const service = new ChannelService();
    expect(() =>
      service.create({ ...validInput, url: 'ftp://bad.com/stream.m3u8' })
    ).toThrow('Invalid URL');
  });

  it('validates name is required', () => {
    const service = new ChannelService();
    expect(() =>
      service.create({ ...validInput, name: '' })
    ).toThrow('Name is required');
  });
});

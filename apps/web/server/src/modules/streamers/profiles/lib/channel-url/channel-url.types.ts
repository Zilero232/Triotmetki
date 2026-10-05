import type { StreamerChannel, StreamerChannelInput, StreamerPlatform } from '@otmetki/schemas';

export type ParseChannelInput = StreamerChannelInput;

export type ParsedChannel = Omit<StreamerChannel, 'verified'>;

export type HandleOfInput = {
  platform: StreamerPlatform;
  url: URL;
};

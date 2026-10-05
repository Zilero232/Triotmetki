import type { StreamerPlatform } from '@otmetki/schemas';

export type LiveStream = {
  platform: StreamerPlatform;
  handle: string;
  viewers: number | null;
};

type LiveChannelRef = {
  platform: StreamerPlatform;
  handle: string;
};

export type MergeLiveInput = {
  channels: readonly LiveChannelRef[];
  streams: readonly LiveStream[];
};

export type LiveState = {
  isLive: boolean;
  platform: StreamerPlatform | null;
  viewers: number | null;
};

export type WentLiveInput = {
  wasLive: boolean;
  isLive: boolean;
};

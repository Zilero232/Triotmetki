import { firstBy } from 'remeda';

import type { LiveState, MergeLiveInput, WentLiveInput } from './live-status.types';

export const mergeLiveStatus = ({ channels, streams }: MergeLiveInput): LiveState => {
  const live = channels.flatMap((channel) => {
    const stream = streams.find((candidate) => candidate.platform === channel.platform && candidate.handle === channel.handle.toLowerCase());

    return stream ? [stream] : [];
  });

  const top = firstBy(live, [(stream) => stream.viewers ?? -1, 'desc']);

  if (!top) {
    return { isLive: false, platform: null, viewers: null };
  }

  return { isLive: true, platform: top.platform, viewers: top.viewers };
};

export const wentLive = ({ wasLive, isLive }: WentLiveInput): boolean => !wasLive && isLive;

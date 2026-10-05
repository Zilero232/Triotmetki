import type { StreamerFollow, StreamerProfile } from '../../../../../generated';

export type StreamerFollowRow = StreamerFollow & {
  profile: Pick<StreamerProfile, 'displayName' | 'isLive' | 'slug'>;
};

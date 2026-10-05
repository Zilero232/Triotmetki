import type { StreamerChannel as StreamerChannelView } from '@otmetki/schemas';

import type { StreamerChannel } from '../../../../../generated';

export const toChannelView = (channel: StreamerChannel): StreamerChannelView => ({
  platform: channel.platform,
  handle: channel.handle,
  url: channel.url,
  verified: channel.verifiedAt !== null
});

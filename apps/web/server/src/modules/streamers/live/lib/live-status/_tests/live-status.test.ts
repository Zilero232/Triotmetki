import { describe, expect, it } from 'vitest';

import { mergeLiveStatus, wentLive } from '../live-status';

describe('mergeLiveStatus', () => {
  const channels = [
    { platform: 'twitch', handle: 'Jove' },
    { platform: 'vkVideoLive', handle: 'jove' }
  ] as const;

  it('is offline without a matching stream', () => {
    expect(mergeLiveStatus({ channels, streams: [{ platform: 'twitch', handle: 'someone', viewers: 10 }] })).toEqual({
      isLive: false,
      platform: null,
      viewers: null
    });
  });

  it('picks the platform with the most viewers', () => {
    expect(
      mergeLiveStatus({
        channels,
        streams: [
          { platform: 'twitch', handle: 'jove', viewers: 1200 },
          { platform: 'vkVideoLive', handle: 'jove', viewers: 4000 }
        ]
      })
    ).toEqual({ isLive: true, platform: 'vkVideoLive', viewers: 4000 });
  });

  it('keeps a live stream with unknown viewers', () => {
    expect(mergeLiveStatus({ channels, streams: [{ platform: 'twitch', handle: 'jove', viewers: null }] }).isLive).toBe(true);
  });
});

describe('wentLive', () => {
  it('fires only on the offline to live edge', () => {
    expect(wentLive({ wasLive: false, isLive: true })).toBe(true);
    expect(wentLive({ wasLive: true, isLive: true })).toBe(false);
  });
});

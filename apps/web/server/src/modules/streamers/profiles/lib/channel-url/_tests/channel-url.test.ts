import { describe, expect, it } from 'vitest';

import { parseChannel } from '../channel-url';

describe('parseChannel', () => {
  it('normalises a Twitch login', () => {
    expect(parseChannel({ platform: 'twitch', url: 'https://www.twitch.tv/Jove/' })).toEqual({
      platform: 'twitch',
      handle: 'jove',
      url: 'https://twitch.tv/Jove'
    });
  });

  it('reads YouTube handles and channel ids', () => {
    expect(parseChannel({ platform: 'youtube', url: 'https://youtube.com/@NearYou' })?.handle).toBe('@nearyou');
    expect(parseChannel({ platform: 'youtube', url: 'https://www.youtube.com/channel/UCabc_123' })?.handle).toBe('UCabc_123');
  });

  it('reads VK Видео Live and Boosty slugs', () => {
    expect(parseChannel({ platform: 'vkVideoLive', url: 'https://live.vkvideo.ru/korben' })?.handle).toBe('korben');
    expect(parseChannel({ platform: 'telegram', url: 'https://t.me/s/protanki' })?.handle).toBe('protanki');
  });

  it('rejects a foreign host or a malformed url', () => {
    expect(parseChannel({ platform: 'twitch', url: 'https://evil.example/jove' })).toBeNull();
    expect(parseChannel({ platform: 'twitch', url: 'not a url' })).toBeNull();
    expect(parseChannel({ platform: 'twitch', url: 'https://twitch.tv/' })).toBeNull();
  });
});

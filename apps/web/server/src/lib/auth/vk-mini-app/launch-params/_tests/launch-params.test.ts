import { getUnixTime, subHours } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { signLaunchParams } from 'vk-launch-params';

import { verifyVkLaunchParams } from '../launch-params';

const SECRET = 'wvl68m4dR1UpLrVRli';
const NOW = new Date('2026-09-26T12:00:00Z');

const signed = (overrides: Partial<Parameters<typeof signLaunchParams>[0]> = {}) =>
  signLaunchParams(
    {
      vk_user_id: 494_075,
      vk_app_id: 6_736_218,
      vk_is_app_user: true,
      vk_are_notifications_enabled: false,
      vk_language: 'ru',
      vk_access_token_settings: '',
      vk_platform: 'mobile_android',
      vk_is_favorite: false,
      vk_ref: 'other',
      vk_ts: getUnixTime(NOW) - 60,
      ...overrides
    },
    SECRET
  );

describe('verifyVkLaunchParams', () => {
  it('accepts fresh params signed with the app secret', () => {
    expect(verifyVkLaunchParams({ launchParams: `?${signed()}`, appId: 6_736_218, appSecret: SECRET, now: NOW })).toEqual({
      vkUserId: 494_075,
      languageCode: 'ru'
    });
  });

  it('rejects a wrong secret, another app and stale params', () => {
    expect(verifyVkLaunchParams({ launchParams: signed(), appId: 0, appSecret: 'other-secret', now: NOW })).toBeNull();
    expect(verifyVkLaunchParams({ launchParams: signed(), appId: 1, appSecret: SECRET, now: NOW })).toBeNull();
    expect(verifyVkLaunchParams({ launchParams: signed({ vk_ts: getUnixTime(NOW) - 200_000 }), appId: 0, appSecret: SECRET, now: NOW })).toBeNull();
  });

  it('rejects launch params signed more than an hour ago', () => {
    const vkTs = getUnixTime(subHours(NOW, 1)) - 1;

    expect(verifyVkLaunchParams({ launchParams: signed({ vk_ts: vkTs }), appId: 0, appSecret: SECRET, now: NOW })).toBeNull();
  });

  it('rejects everything without a configured secret', () => {
    expect(verifyVkLaunchParams({ launchParams: signed(), appId: 0, appSecret: '', now: NOW })).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import type { RoutingSettings } from '../channel-routing.types';

import { NOTIFICATION_ROUTING } from '../../../config/delivery.constants';
import { routeDigest, routeEvent, splitQuiet } from '../channel-routing';

const everything: RoutingSettings = {
  channels: ['site', 'telegram', 'webPush', 'email'],
  events: ['moeGained', 'sessionFinished', 'bonusCode'],
  quietHours: null,
  sessionReport: true,
  weeklyDigest: true
};

const allAvailable = { telegram: true, webPush: true, email: true };

describe('routeEvent', () => {
  it('drops an event the user did not subscribe to', () => {
    expect(routeEvent({ event: 'premiumOffer', settings: everything, available: allAvailable })).toEqual([]);
  });

  it('keeps a storage notice in the site inbox even when the user turned it off', () => {
    expect(routeEvent({ event: 'replayOverflow', settings: everything, available: allAvailable })).toEqual(['site']);
  });

  it('never routes a single event to email', () => {
    expect(routeEvent({ event: 'moeGained', settings: everything, available: allAvailable })).not.toContain('email');
  });

  it('delivers a watchlist digest the user opted into on the watchlist, e-mail included', () => {
    expect(routeEvent({ event: 'watchlistDigest', settings: everything, available: allAvailable })).toContain('email');
  });

  it('keeps the watchlist digest out of e-mail when the channel is off or unreachable', () => {
    expect(routeEvent({ event: 'watchlistDigest', settings: { ...everything, channels: ['site'] }, available: allAvailable })).toEqual(['site']);
    expect(routeEvent({ event: 'watchlistDigest', settings: everything, available: { ...allAvailable, email: false } })).not.toContain('email');
  });

  it('keeps only the channels the user enabled and can receive', () => {
    const channels = routeEvent({
      event: 'moeGained',
      settings: { ...everything, channels: ['site', 'telegram'] },
      available: { ...allAvailable, telegram: false }
    });

    expect(channels).toEqual(['site']);
  });

  it('treats the site inbox as always reachable', () => {
    const channels = routeEvent({
      event: 'moeGained',
      settings: { ...everything, channels: ['site'] },
      available: { telegram: false, webPush: false, email: false }
    });

    expect(channels).toEqual(['site']);
  });

  it('silences session reports when the report toggle is off', () => {
    expect(routeEvent({ event: 'sessionFinished', settings: { ...everything, sessionReport: false }, available: allAvailable })).toEqual([]);
  });
});

describe('routeDigest', () => {
  it('sends nothing unless the weekly digest is on', () => {
    expect(routeDigest({ settings: { ...everything, weeklyDigest: false }, available: allAvailable })).toEqual([]);
  });

  it('uses email whenever it is reachable, even if email is not a chosen channel', () => {
    expect(routeDigest({ settings: { ...everything, channels: ['site'] }, available: allAvailable })).toEqual(['email']);
  });

  it('only uses the digest channels', () => {
    const channels = routeDigest({ settings: everything, available: allAvailable });

    expect(channels.every((channel) => NOTIFICATION_ROUTING.digestChannels.includes(channel))).toBe(true);
  });
});

describe('splitQuiet', () => {
  it('delivers everything now outside quiet hours', () => {
    expect(splitQuiet({ channels: ['site', 'telegram'], delayMs: 0 })).toEqual({ now: ['site', 'telegram'], later: [] });
  });

  it('holds back the noisy channels during quiet hours and keeps the inbox', () => {
    const { now, later } = splitQuiet({ channels: ['site', 'telegram', 'webPush'], delayMs: 60_000 });

    expect(now).toEqual(['site']);
    expect(later).toEqual([...NOTIFICATION_ROUTING.quietChannels]);
  });
});

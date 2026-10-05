import { fromUnixTime } from 'date-fns';
import { describe, expect, it } from 'vitest';

import type { StoredPlayer } from '../../poll-pipeline/poll-pipeline.types';

import { accountInfo } from '../../poll-pipeline/_tests/poll-pipeline.fixtures';
import { changesClan, playerIdentity } from '../player-identity';

const NOW = new Date('2026-09-26T12:00:00Z');

const stored = (fields: Partial<StoredPlayer> = {}): StoredPlayer => ({
  accountId: 1,
  clanId: null,
  lastBattleAt: null,
  lastPolledAt: null,
  trackingTier: 'population',
  ...fields
});

const info = (clanId: number | null) => ({ ...accountInfo({ accountId: 1, battles: 100, lastBattleTime: 1_700_000_000 }), clan_id: clanId });

describe('playerIdentity', () => {
  it('promotes the player to the active tier when asked', () => {
    expect(
      playerIdentity({ info: info(null), previous: stored({ trackingTier: 'dormant' }), tier: 'population', promote: true, now: NOW }).trackingTier
    ).toBe('active');
  });

  it('keeps the stored tier of a known player instead of the batch tier', () => {
    expect(
      playerIdentity({ info: info(null), previous: stored({ trackingTier: 'active' }), tier: 'population', promote: false, now: NOW }).trackingTier
    ).toBe('active');
  });

  it('keeps an unknown logout time as null and converts a known one from unix seconds', () => {
    const logoutAt = 1_700_000_500;

    expect(playerIdentity({ info: info(null), previous: undefined, tier: 'population', promote: false, now: NOW }).logoutAt).toBeNull();

    expect(
      playerIdentity({ info: { ...info(null), logout_at: logoutAt }, previous: undefined, tier: 'population', promote: false, now: NOW }).logoutAt
    ).toEqual(fromUnixTime(logoutAt));
  });
});

describe('changesClan', () => {
  it('sees no change for a known player in the same clan or a new clanless player', () => {
    expect(changesClan({ info: info(5), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW })).toBe(false);
    expect(changesClan({ info: info(null), previous: undefined, tier: 'population', promote: false, now: NOW })).toBe(false);
  });

  it('sees a change when a known player switches or leaves a clan, or a new player arrives in one', () => {
    expect(changesClan({ info: info(9), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW })).toBe(true);
    expect(changesClan({ info: info(null), previous: stored({ clanId: 5 }), tier: 'population', promote: false, now: NOW })).toBe(true);
    expect(changesClan({ info: info(9), previous: undefined, tier: 'population', promote: false, now: NOW })).toBe(true);
  });
});

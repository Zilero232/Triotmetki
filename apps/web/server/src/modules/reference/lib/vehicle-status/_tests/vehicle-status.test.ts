import { TANK_ROLES } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import type { ClassifyVehicleInput } from '../vehicle-status.types';

import { VEHICLE_STATUS } from '../../../config/vehicle-status.constants';
import { classifyVehicle, isPreferentialVehicle, readSpecTraits, toTankRole } from '../vehicle-status';

const PREMIUM: ClassifyVehicleInput = {
  summary: { tier: 8, isPremium: true, isCollectible: false },
  spec: { tags: ['mediumTank'], role: 'role_MT_universal', notInShop: true },
  hasOffers: false
};

const REGULAR: ClassifyVehicleInput = {
  summary: { tier: 8, isPremium: false, isCollectible: false },
  spec: { tags: ['mediumTank'], role: null, notInShop: false },
  hasOffers: false
};

describe('readSpecTraits', () => {
  it('reads tags, role and the shop flag from a stored spec', () => {
    expect(readSpecTraits({ tags: ['a'], role: 'role_SPG', notInShop: true, other: 1 })).toEqual({ tags: ['a'], role: 'role_SPG', notInShop: true });
  });

  it('falls back to an empty trait set for a spec that is not an object', () => {
    expect(readSpecTraits(null)).toEqual({ tags: [], role: null, notInShop: false });
  });

  it('tolerates a malformed field without losing the others', () => {
    expect(readSpecTraits({ tags: 'x', role: 5, notInShop: true })).toEqual({ tags: [], role: null, notInShop: true });
  });
});

describe('toTankRole', () => {
  it('maps every known game role tag to its role', () => {
    for (const role of TANK_ROLES) {
      expect(toTankRole(`${VEHICLE_STATUS.rolePrefix}${role}`)).toBe(role);
    }
  });

  it('returns null for an unknown or unprefixed tag', () => {
    expect(toTankRole('role_unknown')).toBeNull();
    expect(toTankRole('MT_universal')).toBeNull();
    expect(toTankRole(null)).toBeNull();
  });
});

describe('classifyVehicle', () => {
  it('puts collector vehicles first whatever their price', () => {
    expect(classifyVehicle({ ...PREMIUM, summary: { ...PREMIUM.summary, isCollectible: true } })).toBe('collector');
  });

  it('treats a credit vehicle hidden from the shop as removed', () => {
    expect(classifyVehicle({ ...REGULAR, spec: { ...REGULAR.spec, notInShop: true } })).toBe('removed');
    expect(classifyVehicle(REGULAR)).toBe('researchable');
  });

  it('keeps a premium vehicle a shop premium when the game shop sells it or our offer history saw it', () => {
    expect(classifyVehicle({ ...PREMIUM, spec: { ...PREMIUM.spec, notInShop: false } })).toBe('premium');
    expect(classifyVehicle({ ...PREMIUM, hasOffers: true, spec: { ...PREMIUM.spec, tags: ['special'] } })).toBe('premium');
  });

  it('marks a hidden premium as a reward by its tags or its tier', () => {
    expect(classifyVehicle({ ...PREMIUM, spec: { ...PREMIUM.spec, tags: ['special'] } })).toBe('reward');
    expect(classifyVehicle({ ...PREMIUM, spec: { ...PREMIUM.spec, tags: ['clanWarsBattles'] } })).toBe('reward');
    expect(classifyVehicle({ ...PREMIUM, summary: { ...PREMIUM.summary, tier: VEHICLE_STATUS.rewardMinTier } })).toBe('reward');
    expect(classifyVehicle(PREMIUM)).toBe('premium');
  });
});

describe('isPreferentialVehicle', () => {
  it('reads preferential matchmaking from the client tag', () => {
    expect(isPreferentialVehicle({ tags: ['heavyTank', VEHICLE_STATUS.preferentialTag] })).toBe(true);
  });

  it('treats a vehicle without the tag as regular matchmaking', () => {
    expect(isPreferentialVehicle({ tags: ['heavyTank', 'premiumIGR'] })).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { MAP_CAMOUFLAGES, MAP_MODE_KINDS, MAP_MODE_PREFIXES } from '../../../config';
import { isMapCamouflage, mapModeKind, mapModeKinds } from '../map-mode';

describe('mapModeKind', () => {
  it('recognises the game mode behind every known prefix', () => {
    MAP_MODE_KINDS.forEach((kind) => expect(mapModeKind(MAP_MODE_PREFIXES[kind])).toBe(kind));
  });

  it('treats numbered revisions of a mode as the same mode', () => {
    MAP_MODE_KINDS.forEach((kind) => expect(mapModeKind(`${MAP_MODE_PREFIXES[kind]}2`)).toBe(kind));
  });

  it('ignores the case of the server string', () => {
    expect(mapModeKind(MAP_MODE_PREFIXES.standard.toUpperCase())).toBe('standard');
  });

  it('leaves a mode the client does not know unmapped', () => {
    expect(mapModeKind('frontline_epic')).toBeNull();
  });
});

describe('mapModeKinds', () => {
  it('lists each known mode once, however many revisions the server reports', () => {
    expect(mapModeKinds(['ctf', 'ctf30x30', 'domination', 'domination3', 'assault2'])).toEqual(['standard', 'encounter', 'assault']);
  });

  it('drops internal and unknown modes instead of showing their ids', () => {
    expect(mapModeKinds(['bootcamp', 'maps_training', 'bob', 'epic', 'comp7'])).toEqual(['onslaught']);
  });
});

describe('isMapCamouflage', () => {
  it('accepts every known camouflage', () => {
    expect(MAP_CAMOUFLAGES.every(isMapCamouflage)).toBe(true);
  });

  it('rejects a missing or unknown camouflage', () => {
    expect(isMapCamouflage(null)).toBe(false);
    expect(isMapCamouflage('tropical')).toBe(false);
  });
});

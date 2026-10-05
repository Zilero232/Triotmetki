import type { TankPatchChange } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import { SPEC_DIRECTION } from '../../../config/patches.constants';
import { changeEffect, patchVerdict, readSpecChanges } from '../spec-patches';

const [higher = ''] = SPEC_DIRECTION.higher;
const [lower = ''] = SPEC_DIRECTION.lower;
const [higherPrefix = ''] = SPEC_DIRECTION.higherPrefixes;

const withEffect = (effect: TankPatchChange['effect']): TankPatchChange => ({ key: 'x', before: 1, after: 2, effect });

describe('changeEffect', () => {
  it('calls a rise better where higher is better', () => {
    expect(changeEffect({ path: higher, before: 1, after: 2 })).toBe('better');
    expect(changeEffect({ path: higher, before: 2, after: 1 })).toBe('worse');
  });

  it('calls a rise worse where lower is better', () => {
    expect(changeEffect({ path: lower, before: 1, after: 2 })).toBe('worse');
    expect(changeEffect({ path: lower, before: 2, after: 1 })).toBe('better');
  });

  it('judges a nested path by its last segment', () => {
    expect(changeEffect({ path: ['gun', lower].join(SPEC_DIRECTION.separator), before: 2, after: 1 })).toBe('better');
  });

  it('treats a path under a higher-is-better prefix as higher is better', () => {
    expect(changeEffect({ path: `${higherPrefix}unlisted`, before: 1, after: 2 })).toBe('better');
  });

  it('lets a lower-is-better key win over a higher-is-better prefix', () => {
    expect(changeEffect({ path: `${higherPrefix}${lower}`, before: 1, after: 2 })).toBe('worse');
  });

  it('stays neutral for an unknown key, a non-numeric value or no change', () => {
    expect(changeEffect({ path: 'unknownKey', before: 1, after: 2 })).toBe('neutral');
    expect(changeEffect({ path: higher, before: 'a', after: 'b' })).toBe('neutral');
    expect(changeEffect({ path: higher, before: null, after: 2 })).toBe('neutral');
    expect(changeEffect({ path: higher, before: 2, after: 2 })).toBe('neutral');
  });
});

describe('readSpecChanges', () => {
  it('reads a list of changes', () => {
    const changes = [{ path: higher, before: 1, after: 2 }];

    expect(readSpecChanges(changes)).toEqual(changes);
  });

  it('returns null for malformed input', () => {
    expect(readSpecChanges({ path: higher })).toBeNull();
    expect(readSpecChanges([{ path: higher, before: {} }])).toBeNull();
  });
});

describe('patchVerdict', () => {
  it('marks the first patch as new whatever it changed', () => {
    expect(patchVerdict({ changes: [withEffect('worse')], isFirst: true })).toBe('new');
  });

  it('classifies a patch by the direction of its changes', () => {
    expect(patchVerdict({ changes: [withEffect('better'), withEffect('neutral')], isFirst: false })).toBe('buff');
    expect(patchVerdict({ changes: [withEffect('worse')], isFirst: false })).toBe('nerf');
    expect(patchVerdict({ changes: [withEffect('better'), withEffect('worse')], isFirst: false })).toBe('mixed');
  });

  it('calls a patch of only neutral or no changes just changed', () => {
    expect(patchVerdict({ changes: [withEffect('neutral')], isFirst: false })).toBe('changed');
    expect(patchVerdict({ changes: [], isFirst: false })).toBe('changed');
  });
});

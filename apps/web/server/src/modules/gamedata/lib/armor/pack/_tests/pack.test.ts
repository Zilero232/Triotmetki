import { decodeArmorGeometry } from '@otmetki/gamedata';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { COLLISION_FIXTURES, loadIs, readFixture } from '../../../_tests/fixtures';
import { parseCollision } from '../../../parsers/collision/collision';
import { joinArmorModel } from '../../join/join';
import { armorStorageKey, packArmorGeometry } from '../pack';
import { ARMOR_PACK } from '../pack.constants';

const { geometry } = joinArmorModel({ spec: loadIs(), collision: parseCollision(readFixture(COLLISION_FIXTURES.collision)) });

describe('packArmorGeometry', () => {
  it('produces bytes that decode back to the same pieces', () => {
    const { bytes } = packArmorGeometry(geometry);

    expect(decodeArmorGeometry(bytes).pieces.map(({ name }) => name)).toEqual(geometry.pieces.map(({ name }) => name));
  });

  it('hashes deterministically and differently for different geometry', () => {
    const first = packArmorGeometry(geometry);
    const again = packArmorGeometry(geometry);
    const moved = packArmorGeometry({ ...geometry, mounts: { ...geometry.mounts, hull: [0, 1, 0] } });

    expect(first.hash).toBe(again.hash);
    expect(first.hash).not.toBe(moved.hash);
    expect(first.hash).toHaveLength(ARMOR_PACK.hashLength);
  });

  it('stays inside the per-tank budget', () => {
    expect(gzipSync(packArmorGeometry(geometry).bytes).byteLength).toBeLessThan(ARMOR_PACK.gzipBudgetBytes);
  });
});

describe('armorStorageKey', () => {
  it('addresses the object by tank and content hash under the armor prefix', () => {
    const key = armorStorageKey({ tankId: 1, hash: 'abc' });

    expect(key.startsWith(`${ARMOR_PACK.keyPrefix}/1/`)).toBe(true);
    expect(key).toContain('abc');
  });
});

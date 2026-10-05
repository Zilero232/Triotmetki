import { PLUS_LIMITS } from '@otmetki/schemas';
import { addMinutes } from 'date-fns';
import { describe, expect, it } from 'vitest';

import { pausedOverlayIds } from '../overlay-pause';

const start = new Date('2026-09-26T10:00:00Z');
const overlays = ['c', 'a', 'b', 'd'].map((id, index) => ({ id, createdAt: addMinutes(start, index) }));

describe('pausedOverlayIds', () => {
  it('keeps the oldest free-limit overlays running and pauses the rest', () => {
    expect([...pausedOverlayIds({ overlays, isPlus: false })].sort()).toEqual(['b', 'd']);
  });

  it('pauses nothing for a subscriber within the plus limit', () => {
    expect(pausedOverlayIds({ overlays, isPlus: true }).size).toBe(0);
  });

  it('breaks a creation-time tie by id so the choice is stable', () => {
    const tied = [
      { id: 'y', createdAt: start },
      { id: 'x', createdAt: start },
      { id: 'z', createdAt: start }
    ];

    expect([...pausedOverlayIds({ overlays: tied, isPlus: false })]).toEqual(['z']);
    expect(PLUS_LIMITS.overlays.free).toBe(2);
  });
});

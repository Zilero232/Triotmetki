import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GamefaceMock } from '@/shared/api/gameface/mock';

import { GAMEFACE } from '@/shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';

import { $scroll, rememberScroll } from '../scroll';

let mock: GamefaceMock;

beforeEach(() => {
  $scroll.set({});
  mock = createGamefaceMock({ state: '', clientSize: () => ({ width: 1920, height: 1080 }), onSend: () => null });
  installGamefaceMock(mock);
});

afterEach(() => {
  Object.values(GAMEFACE.globals).forEach((name) => Reflect.deleteProperty(globalThis, name));
});

describe(rememberScroll, () => {
  it('keeps the page position in whole pixels', () => {
    rememberScroll({ page: 'hangar', top: 412.6 });

    expect($scroll.get()).toEqual({ hangar: 413 });
  });

  it('tells the mod the rounded position', () => {
    rememberScroll({ page: 'hangar', top: 412.6 });

    expect(mock.sent()).toEqual([JSON.stringify({ type: 'scroll', page: 'hangar', top: 413 })]);
  });

  it('does not tell the mod a position it already has', () => {
    rememberScroll({ page: 'hangar', top: 300 });

    rememberScroll({ page: 'hangar', top: 300 });

    expect(mock.sent()).toHaveLength(1);
  });
});

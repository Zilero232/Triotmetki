import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GamefaceMock } from '@/shared/api/gameface/mock';

import { GAMEFACE } from '@/shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';
import { addEscapeLayer } from '@/shared/lib/escape-stack';

import { watchEscape } from '../escape-answer';

let mock: GamefaceMock;
const removeLayers: (() => void)[] = [];

const sentTypes = (): string[] =>
  mock
    .sent()
    .map((raw): { type: string } => JSON.parse(raw))
    .map((message) => message.type);

const openPopover = (dismissed: string[]): void => {
  removeLayers.push(addEscapeLayer({ kind: 'popover', onEscape: () => dismissed.push('popover') }));
};

beforeEach(() => {
  mock = createGamefaceMock({ state: '', clientSize: () => ({ width: 1920, height: 1080 }), onSend: () => null });
  installGamefaceMock(mock);
});

afterEach(() => {
  removeLayers.splice(0).forEach((remove) => remove());
  Object.values(GAMEFACE.globals).forEach((name) => Reflect.deleteProperty(globalThis, name));
});

describe(watchEscape, () => {
  it('asks the mod to close the window when nothing is open to step back from', () => {
    const watch = watchEscape();

    watch(1);

    expect(sentTypes()).toEqual(['close']);
  });

  it('dismisses the open layer', () => {
    const dismissed: string[] = [];
    const watch = watchEscape();

    openPopover(dismissed);

    watch(1);

    expect(dismissed).toEqual(['popover']);
  });

  it('tells the mod the Esc is taken when a layer was dismissed', () => {
    const watch = watchEscape();

    openPopover([]);

    watch(1);

    expect(sentTypes()).toEqual(['escape']);
  });

  it('answers each Esc once however often the model repeats it', () => {
    const watch = watchEscape();

    watch(1);
    watch(1);

    expect(sentTypes()).toEqual(['close']);
  });

  it.each([0, null])('leaves the Esc counter %s the page starts with unanswered', (asked) => {
    const watch = watchEscape();

    watch(asked);

    expect(sentTypes()).toEqual([]);
  });
});

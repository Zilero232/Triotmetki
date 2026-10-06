import { describe, expect, it } from 'vitest';

import { parseRichText } from '@/shared/lib/rich-text';

import { changedPanels, emptyContent, readSize, settleSizes } from '../panel-sizes';

const KEPT = parseRichText('урон 1 200');

const SIZE = { lines: 1, width: 100, height: 20 };

describe(settleSizes, () => {
  it('keeps the same sizes object when nothing grew', () => {
    const current = { a: SIZE };

    const settled = settleSizes({ current, readings: new Map([['a', { lines: 1, width: 90, height: 18 }]]) });

    expect(settled).toBe(current);
  });

  it('grows a label that got wider', () => {
    const settled = settleSizes({ current: { a: SIZE }, readings: new Map([['a', { lines: 1, width: 120, height: 20 }]]) });

    expect(settled.a).toEqual({ lines: 1, width: 120, height: 20 });
  });
});

describe(changedPanels, () => {
  it('lists every panel of the first content', () => {
    const next = { lines: new Map([['a', KEPT]]), widgets: new Map([['a', null]]) };

    expect(changedPanels({ previous: emptyContent(), next })).toEqual(['a']);
  });

  it('skips a panel whose lines and widget are the same objects', () => {
    const previous = { lines: new Map([['a', KEPT]]), widgets: new Map([['a', null]]) };
    const next = { lines: new Map([['a', KEPT]]), widgets: new Map([['a', null]]) };

    expect(changedPanels({ previous, next })).toEqual([]);
  });

  it('lists a panel whose lines changed', () => {
    const previous = { lines: new Map([['a', KEPT]]), widgets: new Map([['a', null]]) };
    const next = { lines: new Map([['a', parseRichText('урон 1 300')]]), widgets: new Map([['a', null]]) };

    expect(changedPanels({ previous, next })).toEqual(['a']);
  });
});

describe(readSize, () => {
  it('reads nothing from a label the engine has not laid out', () => {
    expect(readSize({ element: undefined, lines: 1, scale: 1 })).toBeNull();
  });
});

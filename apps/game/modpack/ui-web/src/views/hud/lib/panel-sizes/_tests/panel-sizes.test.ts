// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { parseRichText } from '@/shared/lib/rich-text';

import { changedPanels, elementRef, emptyContent, readCountdown, readSize, settleSizes } from '../panel-sizes';

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

const laidOut = ({ width, height }: { width: number; height: number }): HTMLElement => {
  const element = document.createElement('div');

  Object.defineProperty(element, 'offsetWidth', { value: width });
  Object.defineProperty(element, 'offsetHeight', { value: height });

  return element;
};

describe(readCountdown, () => {
  it('reads the labels that still have frames to measure', () => {
    const elements = new Map([['a', laidOut({ width: 100, height: 20 })]]);

    const readings = readCountdown({ framesLeft: new Map([['a', 2]]), elements, content: emptyContent() });

    expect(readings.get('a')).toEqual({ lines: 0, width: 100, height: 20 });
  });

  it('counts a label down one frame', () => {
    const framesLeft = new Map([['a', 2]]);

    readCountdown({ framesLeft, elements: new Map(), content: emptyContent() });

    expect(framesLeft.get('a')).toBe(1);
  });

  it('drops a label after its last frame', () => {
    const framesLeft = new Map([['a', 1]]);

    readCountdown({ framesLeft, elements: new Map(), content: emptyContent() });

    expect(framesLeft.has('a')).toBe(false);
  });
});

describe(elementRef, () => {
  it('remembers the element of a mounted label', () => {
    const elements = new Map<string, HTMLElement>();
    const element = laidOut({ width: 1, height: 1 });

    elementRef({ elements, id: 'a' })(element);

    expect(elements.get('a')).toBe(element);
  });

  it('forgets the element of an unmounted label', () => {
    const elements = new Map([['a', laidOut({ width: 1, height: 1 })]]);

    elementRef({ elements, id: 'a' })(null);

    expect(elements.has('a')).toBe(false);
  });
});

// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { bindScrollArea, changedMetrics } from '../scroll-binding';

const LAST = { top: 0, content: 0, viewport: 0 };

const scrollBox = (scrollTop: number): HTMLElement => {
  const element = document.createElement('div');

  Object.defineProperty(element, 'scrollHeight', { value: 400 });
  Object.defineProperty(element, 'clientHeight', { value: 100 });
  element.scrollTop = scrollTop;

  return element;
};

describe(changedMetrics, () => {
  it('reads nothing without an element', () => {
    expect(changedMetrics({ element: null, last: LAST })).toBeNull();
  });

  it('gives the new metrics of a box that changed', () => {
    expect(changedMetrics({ element: scrollBox(0), last: LAST })).toEqual({ top: 0, content: 400, viewport: 100 });
  });

  it('gives nothing when the metrics are the same', () => {
    expect(changedMetrics({ element: scrollBox(0), last: { top: 0, content: 400, viewport: 100 } })).toBeNull();
  });
});

describe(bindScrollArea, () => {
  it('starts the box at its initial top', () => {
    const element = scrollBox(0);

    bindScrollArea({ element, initialTop: 120, contain: false, onScroll: vi.fn(), onSettle: vi.fn() });

    expect(element.scrollTop).toBe(120);
  });

  it('reports every scroll of the box', () => {
    const element = scrollBox(0);
    const onScroll = vi.fn();

    bindScrollArea({ element, initialTop: 0, contain: false, onScroll, onSettle: vi.fn() });
    element.dispatchEvent(new Event('scroll'));

    expect(onScroll).toHaveBeenCalledOnce();
  });

  it('stops reporting once unbound', () => {
    const element = scrollBox(0);
    const onScroll = vi.fn();

    bindScrollArea({ element, initialTop: 0, contain: false, onScroll, onSettle: vi.fn() }).unbind();
    element.dispatchEvent(new Event('scroll'));

    expect(onScroll).not.toHaveBeenCalled();
  });
});

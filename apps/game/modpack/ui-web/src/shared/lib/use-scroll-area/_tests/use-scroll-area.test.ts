// @vitest-environment jsdom
import type { ReactNode } from 'react';

import { act, render, renderHook } from '@testing-library/react';
import { createElement, Fragment } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ScrollMetrics } from '@/shared/lib/scroll-metrics';

import { SCROLL_AREA } from '@/shared/config';
import { SMOOTH_SCROLL } from '@/shared/lib/smooth-scroll';

import { useScrollArea } from '../use-scroll-area';

const unmounts: (() => void)[] = [];

type Box = { content: number; height: number };

const viewport = ({ content, height }: Box): HTMLDivElement => {
  const element = document.createElement('div');

  Object.defineProperty(element, 'scrollHeight', { value: content });
  Object.defineProperty(element, 'clientHeight', { value: height });

  return element;
};

const gamefaceViewport = ({ content, height }: Box): HTMLDivElement => {
  const element = document.createElement('div');
  const inner = document.createElement('div');

  Object.defineProperty(element, 'scrollHeight', { value: undefined });
  Object.defineProperty(element, 'clientHeight', { value: undefined });
  Object.defineProperty(element, 'offsetHeight', { value: height });
  Object.defineProperty(inner, 'offsetHeight', { value: content });
  element.append(inner);

  return element;
};

const measureBox = (element: HTMLDivElement) => {
  vi.useFakeTimers();

  const hook = renderHook(useScrollArea);

  unmounts.push(hook.unmount);
  hook.result.current.viewportRef.current = element;
  act(() => vi.advanceTimersByTime(SCROLL_AREA.measureMs));

  return hook.result.current.thumb;
};

const measure = (box: Box) => measureBox(viewport(box));

const Area = ({ box, contain, children }: { box: HTMLDivElement; contain: boolean; children?: ReactNode }) => {
  const area = useScrollArea({ contain });

  area.viewportRef.current = box;

  return createElement(Fragment, null, children);
};

const wheelIn = ({ contain }: { contain: boolean }) => {
  vi.useFakeTimers();

  const outer = viewport({ content: 2000, height: 500 });
  const inner = viewport({ content: 900, height: 300 });

  outer.append(inner);
  document.body.append(outer);

  const view = render(createElement(Area, { box: outer, contain: false }, createElement(Area, { box: inner, contain })));

  unmounts.push(view.unmount);

  return { outer, inner };
};

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe(useScrollArea, () => {
  it('shows a thumb sized by the visible share once the content is measured', () => {
    const thumb = measure({ content: 1000, height: 500 });

    expect(thumb).toEqual({ visible: true, size: 250, offset: 0 });
  });

  it('measures a viewport Gameface leaves without scrollHeight and clientHeight', () => {
    const thumb = measureBox(gamefaceViewport({ content: 1000, height: 500 }));

    expect(thumb).toEqual({ visible: true, size: 250, offset: 0 });
  });

  it('hides the thumb when everything fits', () => {
    const thumb = measure({ content: 300, height: 500 });

    expect(thumb.visible).toBe(false);
  });

  it('reports the measured metrics when they change', () => {
    vi.useFakeTimers();

    const reported: ScrollMetrics[] = [];
    const hook = renderHook(() => useScrollArea({ onMetrics: (metrics) => reported.push(metrics) }));

    unmounts.push(hook.unmount);
    hook.result.current.viewportRef.current = viewport({ content: 1000, height: 500 });
    act(() => vi.advanceTimersByTime(SCROLL_AREA.measureMs * 3));

    expect(reported).toEqual([{ top: 0, content: 1000, viewport: 500 }]);
  });
});

describe('useScrollArea wheel', () => {
  const wheelAtInnerEnd = ({ contain }: { contain: boolean }) => {
    const { outer, inner } = wheelIn({ contain });

    inner.scrollTop = 600;

    act(() => {
      inner.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
      vi.advanceTimersByTime(SMOOTH_SCROLL.durationMs * 2);
    });

    return outer;
  };

  it('hands the wheel on to the page at its end by default', () => {
    expect(wheelAtInnerEnd({ contain: false }).scrollTop).toBeGreaterThan(0);
  });

  it('keeps the wheel from the page at its end when it contains it', () => {
    expect(wheelAtInnerEnd({ contain: true }).scrollTop).toBe(0);
  });
});

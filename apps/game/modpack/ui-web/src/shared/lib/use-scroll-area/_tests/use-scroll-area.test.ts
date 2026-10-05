// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SCROLL_AREA } from '@/shared/config';

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

afterEach(() => {
  unmounts.splice(0).forEach((unmount) => unmount());
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
});

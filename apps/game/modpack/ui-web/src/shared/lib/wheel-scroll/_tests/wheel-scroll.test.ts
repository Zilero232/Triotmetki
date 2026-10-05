// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GAMEFACE } from '@/shared/api/gameface';
import { createGamefaceMock, installGamefaceMock } from '@/shared/api/gameface/mock';
import { SCROLL_AREA } from '@/shared/config';
import { isRecord } from '@/shared/lib/is-record';
import { forgetReports } from '@/shared/lib/page-diag';
import { SMOOTH_SCROLL } from '@/shared/lib/smooth-scroll';

import { bindWheelScroll, blockPageWheel, thumbOf, topFromThumb, wheelDelta, wheelScroll } from '../wheel-scroll';

const STEP = 60;
const unbinders: (() => void)[] = [];

const glideOut = (): void => {
  vi.advanceTimersByTime(SMOOTH_SCROLL.durationMs * 2);
};

const box = ({ content, height, top = 0 }: { content: number; height: number; top?: number }): HTMLDivElement => {
  const element = document.createElement('div');

  Object.defineProperty(element, 'scrollHeight', { value: content });
  Object.defineProperty(element, 'clientHeight', { value: height });
  Object.defineProperty(element, 'hasAttribute', { value: undefined });
  element.scrollTop = top;

  return element;
};

const gamefaceBox = (): HTMLDivElement => {
  const element = document.createElement('div');
  const content = document.createElement('div');

  Object.defineProperty(element, 'scrollHeight', { value: undefined });
  Object.defineProperty(element, 'clientHeight', { value: undefined });
  Object.defineProperty(element, 'offsetHeight', { value: 500 });
  Object.defineProperty(content, 'offsetHeight', { value: 2000 });
  element.append(content);

  return element;
};

const install = (scale: number) => {
  const mock = createGamefaceMock({ state: '', clientSize: () => ({ width: 1920, height: 1080 }), onSend: () => null });
  const viewEnv = mock.scope[GAMEFACE.globals.viewEnv];

  if (!isRecord(viewEnv)) {
    throw new Error('the Gameface mock has no viewEnv');
  }

  viewEnv[GAMEFACE.viewEnv.remToPx] = (value: number) => value * scale;
  installGamefaceMock(mock);

  return mock;
};

const notch = (down: number) => new WheelEvent('wheel', { deltaY: -down, bubbles: true, cancelable: true });

const scrollArea = () => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });

  const mock = install(2);
  const area = box({ content: 2000, height: 500 });
  const row = document.createElement('div');
  const onScrolled = vi.fn();

  area.append(row);
  document.body.append(area);

  const unbind = bindWheelScroll({ element: area, onScrolled });

  unbinders.push(unbind);

  const wheel = (deltaY: number) => {
    const event = notch(deltaY);

    row.dispatchEvent(event);
    glideOut();

    return event;
  };

  return { mock, area, onScrolled, unbind, wheel };
};

const nestedAreas = () => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
  install(1);

  const outer = box({ content: 2000, height: 500 });
  const inner = box({ content: 900, height: 300 });
  const leaf = document.createElement('span');

  inner.append(leaf);
  outer.append(inner);
  document.body.append(outer);
  unbinders.push(bindWheelScroll({ element: outer }), bindWheelScroll({ element: inner }));

  const wheelDown = () => {
    leaf.dispatchEvent(notch(100));
    glideOut();
  };

  return { outer, inner, wheelDown };
};

afterEach(() => {
  unbinders.splice(0).forEach((unbind) => unbind());
  document.body.replaceChildren();
  forgetReports();
  vi.useRealTimers();
});

describe(wheelScroll, () => {
  it('scrolls down on a positive delta, as the client scroll areas read it', () => {
    expect(wheelScroll({ top: 100, deltaY: 120, max: 1000, step: STEP })).toBe(160);
  });

  it('scrolls up on a negative delta', () => {
    expect(wheelScroll({ top: 100, deltaY: -3, max: 1000, step: STEP })).toBe(40);
  });

  it.each([1, 900])('moves one step per notch for a delta of %d', (deltaY) => {
    expect(wheelScroll({ top: 0, deltaY, max: 1000, step: STEP })).toBe(60);
  });

  it('stops at the end of the content', () => {
    expect(wheelScroll({ top: 980, deltaY: 100, max: 1000, step: STEP })).toBe(1000);
  });

  it('stops at the start of the content', () => {
    expect(wheelScroll({ top: 20, deltaY: -100, max: 1000, step: STEP })).toBe(0);
  });

  it('stays at the top when the content fits', () => {
    expect(wheelScroll({ top: 0, deltaY: 100, max: -50, step: STEP })).toBe(0);
  });

  it('stays put without a delta', () => {
    expect(wheelScroll({ top: 40, deltaY: 0, max: 1000, step: STEP })).toBe(40);
  });
});

describe(wheelDelta, () => {
  it('reads deltaY, down as positive', () => {
    expect(wheelDelta({ deltaY: 100 })).toBe(100);
  });

  it('reads the legacy wheelDeltaY an engine without deltaY sends, down as positive', () => {
    expect(wheelDelta({ deltaY: 0, wheelDeltaY: -120 })).toBe(120);
  });

  it('reads the legacy wheelDelta when deltaY is not a number', () => {
    expect(wheelDelta({ deltaY: Number.NaN, wheelDelta: 120 })).toBe(-120);
  });

  it('reads no movement from an event without any delta', () => {
    expect(wheelDelta({ deltaY: 0 })).toBe(0);
  });

  it('flips the sign Gameface sends, so a notch up scrolls up', () => {
    install(2);

    expect(wheelDelta({ deltaY: 3 })).toBe(-3);
  });
});

describe(thumbOf, () => {
  it('hides the bar when everything fits', () => {
    expect(thumbOf({ top: 0, content: 300, viewport: 400, minThumb: 24 }).visible).toBe(false);
  });

  it('sizes the thumb by the visible share', () => {
    expect(thumbOf({ top: 0, content: 800, viewport: 400, minThumb: 24 })).toEqual({ visible: true, size: 200, offset: 0 });
  });

  it('moves the thumb along the track with the scroll position', () => {
    expect(thumbOf({ top: 400, content: 800, viewport: 400, minThumb: 24 })).toEqual({ visible: true, size: 200, offset: 200 });
  });

  it('never shrinks the thumb below its minimum', () => {
    expect(thumbOf({ top: 0, content: 40_000, viewport: 400, minThumb: 24 }).size).toBe(24);
  });
});

describe(topFromThumb, () => {
  it('turns a dragged thumb back into a scroll position', () => {
    expect(topFromThumb({ offset: 100, size: 200, content: 800, viewport: 400, top: 0 })).toBe(200);
  });

  it('stops at the end of the content for a thumb dragged past the track', () => {
    expect(topFromThumb({ offset: 900, size: 200, content: 800, viewport: 400, top: 0 })).toBe(400);
  });

  it('stays at the top when the content fits', () => {
    expect(topFromThumb({ offset: 50, size: 400, content: 400, viewport: 400, top: 0 })).toBe(0);
  });
});

describe(bindWheelScroll, () => {
  it('glides its box on the wheel Gameface sends to a row inside it, by a step at the interface scale', () => {
    const { area, wheel } = scrollArea();

    wheel(100);

    expect(area.scrollTop).toBe(SCROLL_AREA.step * 2);
  });

  it('keeps the wheel it handles from the engine', () => {
    const { wheel } = scrollArea();

    const event = wheel(100);

    expect(event.defaultPrevented).toBe(true);
  });

  it('tells the page it scrolled', () => {
    const { onScrolled, wheel } = scrollArea();

    wheel(100);

    expect(onScrolled).toHaveBeenCalled();
  });

  it('reports the wheel it hears to the game log only', () => {
    const { mock, wheel } = scrollArea();

    wheel(100);

    const types = mock
      .sent()
      .map((raw): { type: string } => JSON.parse(raw))
      .map((message) => message.type);

    expect(types).toEqual(['diag']);
  });

  it('glides back up on a notch the other way', () => {
    const { area, wheel } = scrollArea();

    wheel(100);

    wheel(-100);

    expect(area.scrollTop).toBe(0);
  });

  it('ignores the wheel once unbound', () => {
    const { area, unbind, wheel } = scrollArea();

    unbind();

    wheel(100);

    expect(area.scrollTop).toBe(0);
  });

  it('glides a box Gameface measures without scrollHeight and clientHeight', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
    install(1);

    const area = gamefaceBox();

    document.body.append(area);
    unbinders.push(bindWheelScroll({ element: area }));
    area.firstElementChild?.dispatchEvent(notch(100));
    glideOut();

    expect(area.scrollTop).toBe(SCROLL_AREA.step);
  });

  it('keeps the wheel for the inner box while it can scroll', () => {
    const { outer, inner, wheelDown } = nestedAreas();

    wheelDown();

    expect(inner.scrollTop).toBe(SCROLL_AREA.step);
    expect(outer.scrollTop).toBe(0);
  });

  it('hands the wheel to the outer box at the inner end', () => {
    const { outer, inner, wheelDown } = nestedAreas();

    inner.scrollTop = 600;

    wheelDown();

    expect(inner.scrollTop).toBe(600);
    expect(outer.scrollTop).toBe(SCROLL_AREA.step);
  });
});

describe(blockPageWheel, () => {
  it('never lets the engine scroll the page natively', () => {
    unbinders.push(blockPageWheel(document));
    const outside = notch(100);

    document.body.dispatchEvent(outside);

    expect(outside.defaultPrevented).toBe(true);
  });
});

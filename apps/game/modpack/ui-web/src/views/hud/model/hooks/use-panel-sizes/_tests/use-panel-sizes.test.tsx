// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedWidget } from '@/features/hud/widget-registry';

import { parseRichText } from '@/shared/lib/rich-text';

import type { Sizes } from '../use-panel-sizes.types';

import { HUD_OVERLAY } from '../../../../config';
import { usePanelSizes } from '../use-panel-sizes';

const ID = 'otmetki.hud.last_battle';

const LINES = new Map([[ID, parseRichText('урон 1 200')]]);

const WIDGETS = new Map<string, ResolvedWidget | null>([[ID, null]]);

const LAID_OUT = { width: 180, height: 46 };

const engine = { width: 0, height: 0 };

const seen: { sizes: Sizes } = { sizes: {} };

const Harness = () => {
  const { sizes, measureRef } = usePanelSizes({ lines: LINES, widgets: WIDGETS });

  seen.sizes = sizes;

  return <div ref={measureRef(ID)} />;
};

const layOut = () => Object.assign(engine, LAID_OUT);

const nextFrames = (count: number) => {
  for (let frame = 0; frame < count; frame += 1) {
    act(() => vi.advanceTimersToNextFrame());
  }
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  Object.assign(engine, { width: 0, height: 0 });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => engine.width);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => engine.height);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  seen.sizes = {};
});

describe(usePanelSizes, () => {
  it('measures a label the browser lays out at once', () => {
    layOut();
    render(<Harness />);

    expect(seen.sizes[ID]).toEqual({ lines: 1, ...LAID_OUT });
  });

  it('keeps a label unmeasured while the engine has not laid it out yet', () => {
    render(<Harness />);

    expect(seen.sizes[ID]).toBeUndefined();
  });

  it('measures the label once the engine lays it out a few frames later, with no new state', () => {
    render(<Harness />);
    nextFrames(1);
    layOut();
    nextFrames(2);

    expect(seen.sizes[ID]).toEqual({ lines: 1, ...LAID_OUT });
  });

  it('stops reading the layout a few frames after the sizes settle', () => {
    layOut();
    render(<Harness />);
    nextFrames(HUD_OVERLAY.measureFrames);

    expect(vi.getTimerCount()).toBe(0);
  });
});

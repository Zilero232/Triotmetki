import { clamp } from 'remeda';

import { gameface } from '@/shared/api/gameface';
import { SCROLL_AREA } from '@/shared/config';
import { rootScale } from '@/shared/lib/design-screen';
import { reportOnce } from '@/shared/lib/page-diag';
import { scrollMax, scrollMaxOf, scrollMetricsOf } from '@/shared/lib/scroll-metrics';
import { createSmoothScroll } from '@/shared/lib/smooth-scroll';

import type { BindWheelScrollInput, Thumb, ThumbInput, TopFromThumbInput, WheelDelta, WheelRoot, WheelScrollInput } from './wheel-scroll.types';

export const wheelScroll = ({ top, deltaY, max, step }: WheelScrollInput): number =>
  clamp(top + Math.sign(deltaY) * step, { min: 0, max: Math.max(max, 0) });

export const thumbOf = ({ top, content, viewport, minThumb }: ThumbInput): Thumb => {
  const max = scrollMax({ content, viewport });

  if (max <= 0 || viewport <= 0) {
    return { visible: false, size: 0, offset: 0 };
  }

  const natural = (viewport / content) * viewport;
  const size = Math.min(Math.max(natural, minThumb), viewport);

  return { visible: true, size, offset: (clamp(top, { min: 0, max }) / max) * (viewport - size) };
};

export const topFromThumb = ({ offset, size, content, viewport }: TopFromThumbInput): number => {
  const max = scrollMax({ content, viewport });
  const track = viewport - size;

  return track > 0 ? clamp((offset / track) * max, { min: 0, max }) : 0;
};

const rawDelta = (event: WheelDelta): number => {
  if (Number.isFinite(event.deltaY) && event.deltaY !== 0) {
    return event.deltaY;
  }

  const legacy = event.wheelDeltaY ?? event.wheelDelta ?? 0;

  return legacy === 0 ? 0 : -legacy;
};

const isEngine = (): boolean => gameface.remScale() !== null;

export const wheelDelta = (event: WheelDelta): number => {
  const delta = rawDelta(event);

  return isEngine() ? -delta : delta;
};

const stepPx = (): number => SCROLL_AREA.step * (gameface.remScale() ?? rootScale());

export const bindWheelScroll = ({ element, onScrolled, contain = false }: BindWheelScrollInput): (() => void) => {
  const glide = createSmoothScroll({ element, onFrame: onScrolled });

  const listener = (event: WheelEvent): void => {
    const deltaY = wheelDelta(event);
    const next = wheelScroll({ top: glide.target(), deltaY, max: scrollMaxOf(element), step: stepPx() });

    event.preventDefault();

    const moved = glide.scrollTo(next);

    if (moved || contain) {
      event.stopPropagation();
    }

    const { content, viewport } = scrollMetricsOf(element);

    reportOnce({
      kind: 'wheel',
      text: `delta ${deltaY} (deltaY ${event.deltaY}), box ${content}/${viewport} px, ${moved ? `gliding to ${next}` : 'at its end'}`
    });
  };

  element.addEventListener('wheel', listener, { passive: false });

  return () => element.removeEventListener('wheel', listener);
};

export const blockPageWheel = (root: WheelRoot): (() => void) => {
  const listener = (event: WheelEvent): void => {
    event.preventDefault();
  };

  root.addEventListener('wheel', listener, { passive: false });

  return () => root.removeEventListener('wheel', listener);
};

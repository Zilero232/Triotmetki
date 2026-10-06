import { easeOutCubic } from '@/shared/lib/easing';

import type { Glide, GlideStep, SmoothScroll, SmoothScrollInput, TopAtInput } from './smooth-scroll.types';

import { SMOOTH_SCROLL } from './smooth-scroll.constants';

const topAt = ({ glide, now }: TopAtInput): GlideStep => {
  const startedAt = glide.startedAt ?? now;
  const progress = Math.min((now - startedAt) / SMOOTH_SCROLL.durationMs, 1);
  const top = Math.round(glide.from + (glide.to - glide.from) * easeOutCubic(progress));

  return { top, done: progress >= 1 };
};

export const createSmoothScroll = ({ element, onFrame }: SmoothScrollInput): SmoothScroll => {
  let glide: Glide | null = null;

  const frame = (now: number): void => {
    if (glide === null || element.scrollTop !== glide.written) {
      glide = null;

      return;
    }

    glide.startedAt ??= now;

    const { top, done } = topAt({ glide, now });

    element.scrollTop = top;
    glide.written = element.scrollTop;
    onFrame?.();

    if (done) {
      glide = null;

      return;
    }

    requestAnimationFrame(frame);
  };

  return {
    target: () => glide?.to ?? element.scrollTop,
    scrollTo: (top) => {
      const from = element.scrollTop;
      const isGliding = glide !== null;

      if (top === (glide?.to ?? from)) {
        return false;
      }

      glide = { from, to: top, startedAt: null, written: from };

      if (!isGliding) {
        requestAnimationFrame(frame);
      }

      return true;
    }
  };
};

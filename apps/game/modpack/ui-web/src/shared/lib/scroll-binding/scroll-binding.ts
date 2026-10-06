import { funnel, isDeepEqual } from 'remeda';

import type { ScrollMetrics } from '@/shared/lib/scroll-metrics';

import { SCROLL_AREA } from '@/shared/config';
import { scrollMetricsOf } from '@/shared/lib/scroll-metrics';
import { bindWheelScroll } from '@/shared/lib/wheel-scroll';

import type { BindScrollAreaInput, ChangedMetricsInput, ScrollBinding } from './scroll-binding.types';

export const changedMetrics = ({ element, last }: ChangedMetricsInput): ScrollMetrics | null => {
  if (!element) {
    return null;
  }

  const next = scrollMetricsOf(element);

  return isDeepEqual(last, next) ? null : next;
};

export const bindScrollArea = ({ element, initialTop, contain, onScroll, onSettle }: BindScrollAreaInput): ScrollBinding => {
  element.scrollTop = initialTop;

  const settled = funnel(() => onSettle(element.scrollTop), { minQuietPeriodMs: SCROLL_AREA.settleMs, triggerAt: 'end' });

  const scrolled = (): void => {
    onScroll();
    settled.call();
  };

  const unbindWheel = bindWheelScroll({ element, onScrolled: scrolled, contain });

  element.addEventListener('scroll', scrolled);

  return {
    scrolled,
    unbind: () => {
      settled.flush();
      unbindWheel();
      element.removeEventListener('scroll', scrolled);
    }
  };
};

'use client';

import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';

import type { IconProps } from '../../lib';

import { CrosshairIcon } from '../../icons';
import { IconBase, useHydrated } from '../../lib';
import { ACCENT, STAR_STYLE } from '../animated.constants';

export const AnimatedCrosshair = (props: IconProps) => {
  const isHydrated = useHydrated();
  const isReduced = useReducedMotion();

  if (!isHydrated) {
    return <CrosshairIcon {...props} />;
  }

  return (
    <IconBase name='crosshair-animated' {...props}>
      <m.g animate={isReduced ? undefined : { rotate: 360 }} style={STAR_STYLE} transition={{ duration: 12, ease: 'linear', repeat: Infinity }}>
        <circle cx='12' cy='12' r='8' strokeDasharray='9 3.57' />
      </m.g>
      <m.path
        animate={isReduced ? undefined : { scale: [1, 0.82, 1] }}
        d='M12 2v4M12 18v4M2 12h4M18 12h4'
        style={STAR_STYLE}
        transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
      />
      <m.path
        animate={isReduced ? undefined : { opacity: [1, 0.35, 1] }}
        d='M12 12h.01'
        stroke={ACCENT}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    </IconBase>
  );
};

'use client';

import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';

import type { AnimatedLogoProps } from '../animated.types';

import { LOGO_SHAPES, OtmetkiLogoIcon } from '../../icons';
import { IconBase, useHydrated } from '../../lib';
import { ACCENT, DRAW, ICON_EASE } from '../animated.constants';

export const AnimatedLogo = ({ withTracer = true, ...props }: AnimatedLogoProps) => {
  const isHydrated = useHydrated();
  const isReduced = useReducedMotion();

  if (!isHydrated) {
    return <OtmetkiLogoIcon {...props} />;
  }

  return (
    <IconBase name='otmetki-logo-animated' {...props}>
      {LOGO_SHAPES.marks.map((d, index) => (
        <m.path
          key={d}
          animate='visible'
          d={d}
          initial={isReduced ? false : 'hidden'}
          transition={{ duration: 0.45, delay: index * 0.3, ease: ICON_EASE }}
          variants={DRAW}
        />
      ))}
      {withTracer && !isReduced && (
        <m.path
          animate={{ pathOffset: [0, 1], opacity: [0, 1, 1, 0] }}
          d={LOGO_SHAPES.tracer}
          initial={{ pathLength: 0.14, pathOffset: 0, opacity: 0 }}
          stroke={ACCENT}
          transition={{ duration: 1.6, delay: 1.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4.5 }}
        />
      )}
    </IconBase>
  );
};

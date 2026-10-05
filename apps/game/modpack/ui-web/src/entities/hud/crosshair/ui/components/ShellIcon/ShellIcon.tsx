import type { ShellIconProps } from './ShellIcon.types';

import { RETICLE_SHELLS } from '../../../config';

import s from './ShellIcon.module.scss';

const { viewBox, noses, paint: paints } = RETICLE_SHELLS;

export const ShellIcon = ({ kind, paint, width, height }: ShellIconProps) => {
  const look = paints[paint];
  const fillOpacity = 'fillOpacity' in look ? look.fillOpacity : 1;
  const strokeOpacity = 'strokeOpacity' in look ? look.strokeOpacity : 1;

  return (
    <span className={s.icon} style={{ width: `${String(width)}rem`, height: `${String(height)}rem` }}>
      <svg
        aria-hidden='true'
        height='100%'
        viewBox={`0 0 ${String(viewBox.width)} ${String(viewBox.height)}`}
        width='100%'
        xmlns='http://www.w3.org/2000/svg'
      >
        {[noses[kind ?? 'ap'], RETICLE_SHELLS.case, RETICLE_SHELLS.rim].map((d) => (
          <path
            key={d}
            d={d}
            fill={look.fill}
            fillOpacity={fillOpacity}
            stroke={look.stroke}
            strokeLinejoin='round'
            strokeOpacity={strokeOpacity}
            strokeWidth={RETICLE_SHELLS.outlineWidth}
          />
        ))}
      </svg>
    </span>
  );
};

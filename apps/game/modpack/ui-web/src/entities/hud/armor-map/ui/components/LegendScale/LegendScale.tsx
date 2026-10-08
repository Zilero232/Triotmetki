import type { LegendScaleProps } from './LegendScale.types';

import { swatchStyle } from '../../../lib/swatch';

import s from './LegendScale.module.scss';

export const LegendScale = ({ scale, kinds, mode, unit }: LegendScaleProps) => (
  <div className={s.legend}>
    <div className={s.bar}>
      {scale.map((entry) => (
        <div key={entry.tone} className={s.stop}>
          <span className={s.swatch} style={swatchStyle({ tone: entry.tone, mode })} />
          <span className={s.label}>{entry.label}</span>
        </div>
      ))}
    </div>
    {unit && <span className={s.unit}>{unit}</span>}
    <div className={s.kinds}>
      {kinds.map((kind) => (
        <span key={`${String(kind.tone)}-${String(kind.pattern)}`} className={s.kind}>
          <span className={s.chip} style={swatchStyle({ tone: kind.tone, mode })}>
            {kind.pattern > 0 && <span className={s.hatch} style={swatchStyle({ tone: 0, mode, pattern: kind.pattern })} />}
          </span>
          {kind.label}
        </span>
      ))}
    </div>
  </div>
);

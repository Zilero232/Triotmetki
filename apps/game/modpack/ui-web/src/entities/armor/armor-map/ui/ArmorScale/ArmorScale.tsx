import type { ArmorScaleProps } from './ArmorScale.types';

import { swatchStyle } from '../../lib/swatch';

import s from './ArmorScale.module.scss';

export const ArmorScale = ({ legend }: ArmorScaleProps) => (
  <div className={s.legend}>
    <div className={s.bar}>
      {legend.scale.map((entry) => (
        <div key={entry.tone} className={s.stop}>
          <span className={s.swatch} style={swatchStyle({ tone: entry.tone, mode: legend.mode })} />
          <span className={s.label}>{entry.label}</span>
        </div>
      ))}
    </div>
    {legend.unit && <span className={s.unit}>{legend.unit}</span>}
    <div className={s.kinds}>
      {legend.kinds.map((kind) => (
        <span key={`${String(kind.tone)}-${String(kind.pattern)}`} className={s.kind}>
          <span className={s.chip} style={swatchStyle({ tone: kind.tone, mode: legend.mode })}>
            {kind.pattern > 0 && <span className={s.hatch} style={swatchStyle({ tone: 0, mode: legend.mode, pattern: kind.pattern })} />}
          </span>
          {kind.label}
        </span>
      ))}
    </div>
  </div>
);

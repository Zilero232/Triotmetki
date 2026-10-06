import type { DamageLogBarProps } from './DamageLogBar.types';

import { DAMAGE_LOG } from '../../../../config';

import s from './DamageLogBar.module.scss';

export const DamageLogBar = ({ bar }: DamageLogBarProps) => (
  <span className={s.track} style={{ width: `${DAMAGE_LOG.bar.width}rem`, height: `${DAMAGE_LOG.bar.height}rem` }}>
    <span className={s.kept} style={{ width: `${bar.kept}rem` }} />
    <span className={s.took} style={{ width: `${bar.took}rem` }} />
  </span>
);

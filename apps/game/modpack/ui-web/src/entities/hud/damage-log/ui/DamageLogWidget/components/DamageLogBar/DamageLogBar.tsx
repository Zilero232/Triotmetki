import { rem, remBox } from '@/shared/lib/css-unit';

import type { DamageLogBarProps } from './DamageLogBar.types';

import { DAMAGE_LOG } from '../../../../config';

import s from './DamageLogBar.module.scss';

export const DamageLogBar = ({ bar }: DamageLogBarProps) => (
  <span className={s.track} style={remBox(DAMAGE_LOG.bar)}>
    <span className={s.kept} style={{ width: rem(bar.kept) }} />
    <span className={s.took} style={{ width: rem(bar.took) }} />
  </span>
);

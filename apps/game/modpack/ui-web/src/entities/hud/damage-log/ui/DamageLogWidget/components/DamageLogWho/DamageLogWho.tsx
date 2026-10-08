import clsx from 'clsx';

import { Glyph } from '@/ui-kit';

import type { DamageLogWhoProps } from './DamageLogWho.types';

import { DAMAGE_LOG } from '../../../../config';

import s from './DamageLogWho.module.scss';

export const DamageLogWho = ({ row }: DamageLogWhoProps) => (
  <span className={s.who}>
    <span className={clsx(s.name, row.muted && s.mutedName)}>{row.name}</span>
    {row.hitsText && <span className={s.hits}>{row.hitsText}</span>}
    <span className={clsx(s.crits, !row.critsText && s.idle)}>
      <Glyph name='module' size={DAMAGE_LOG.critIconSize} tone='warning' />
      {row.critsText}
    </span>
  </span>
);

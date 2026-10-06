import clsx from 'clsx';

import { ClientIcon, Glyph, ShellChip, TabularText, toneClass } from '@/ui-kit';

import type { DamageLogRowProps } from './DamageLogRow.types';

import { DAMAGE_LOG } from '../../../../config';
import { DamageLogBar } from '../DamageLogBar';

import s from './DamageLogRow.module.scss';

export const DamageLogRow = ({ row, isNewest }: DamageLogRowProps) => (
  <div className={clsx(s.row, s[row.tone], row.muted && s.muted, isNewest && s.enter)}>
    {isNewest && <span className={s.flash} />}
    <TabularText className={clsx(s.amount, toneClass(row.tone))} text={row.amountText} />
    <span className={s.outcome}>
      <ClientIcon icon={row.icon} size={DAMAGE_LOG.iconSize} tone={row.tone} />
    </span>
    <span className={s.shell}>{row.shell && <ShellChip gold={row.shell.gold} kind={row.shell.kind} label={row.shell.label} />}</span>
    <span className={s.cls}>
      <ClientIcon icon={row.cls} size={DAMAGE_LOG.classIcon.height} width={DAMAGE_LOG.classIcon.width} />
    </span>
    <span className={s.who}>
      <span className={clsx(s.name, row.muted && s.mutedName)}>{row.name}</span>
      {row.hitsText && <span className={s.hits}>{row.hitsText}</span>}
      {row.critsText && (
        <span className={s.crits}>
          <Glyph name='module' size={DAMAGE_LOG.critIconSize} tone='warning' />
          {row.critsText}
        </span>
      )}
    </span>
    <span className={s.side}>
      {row.bar && <DamageLogBar bar={row.bar} />}
      <ClientIcon icon={row.ammoRack} size={DAMAGE_LOG.iconSize} tone='received' />
    </span>
    {row.note && <span className={s.note}>{row.note}</span>}
  </div>
);

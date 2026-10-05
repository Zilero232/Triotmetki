import clsx from 'clsx';

import { ClientIcon, MiniBar, ShellChip, TabularText, toneClass } from '@/ui-kit';

import type { DamageLogRowProps } from './DamageLogRow.types';

import { DAMAGE_LOG } from '../../../../config';

import s from './DamageLogRow.module.scss';

export const DamageLogRow = ({ row, isNewest }: DamageLogRowProps) => (
  <div className={clsx(s.row, isNewest && s.enter)}>
    {isNewest && <span className={s.index} />}
    <TabularText className={clsx(s.amount, toneClass(row.tone))} text={row.amountText} />
    <ClientIcon className={s.icon} icon={row.icon} size={DAMAGE_LOG.iconSize} tone={row.tone} />
    <span className={s.shell}>{row.shell && <ShellChip gold={row.shell.gold} label={row.shell.label} />}</span>
    <ClientIcon className={s.icon} icon={row.cls} size={DAMAGE_LOG.iconSize} />
    <span className={clsx(s.name, row.muted && s.muted)}>{row.name}</span>
    {row.hitsText && <span className={s.hits}>{row.hitsText}</span>}
    {row.bar && (
      <span className={s.extra}>
        <MiniBar height={DAMAGE_LOG.bar.height} max={row.bar.max} tone='enemy' value={row.bar.value} width={DAMAGE_LOG.bar.width} />
      </span>
    )}
    <ClientIcon className={s.extra} icon={row.ammoRack} size={DAMAGE_LOG.iconSize} />
    {row.note && <span className={s.note}>{row.note}</span>}
  </div>
);

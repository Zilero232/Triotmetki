import clsx from 'clsx';

import { ClientIcon, TabularText, toneClass } from '@/ui-kit';

import type { DamageLogTotalsProps } from './DamageLogTotals.types';

import { DAMAGE_LOG } from '../../../../config';

import s from './DamageLogTotals.module.scss';

export const DamageLogTotals = ({ totals }: DamageLogTotalsProps) => (
  <div className={s.totals}>
    {totals.map((total) => (
      <span key={total.key} className={clsx(s.chip, s[total.tone])}>
        <ClientIcon icon={total.icon} size={DAMAGE_LOG.totalIconSize} tone={total.tone} />
        <TabularText className={clsx(s.value, toneClass(total.tone))} text={total.text} />
      </span>
    ))}
  </div>
);

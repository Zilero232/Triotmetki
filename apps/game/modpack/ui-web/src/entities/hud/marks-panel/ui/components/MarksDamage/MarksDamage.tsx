import clsx from 'clsx';

import { TabularText, toneClass } from '@/ui-kit';

import type { MarksDamageProps } from './MarksDamage.types';

import s from './MarksDamage.module.scss';

export const MarksDamage = ({ damage }: MarksDamageProps) =>
  damage ? (
    <div className={s.line}>
      <span className={s.label}>{damage.label}</span>
      <TabularText className={clsx(s.value, toneClass(damage.tone))} text={damage.value} />
      <TabularText className={s.target} text={damage.target} />
    </div>
  ) : null;

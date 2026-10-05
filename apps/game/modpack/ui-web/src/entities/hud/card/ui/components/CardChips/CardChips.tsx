import clsx from 'clsx';

import { ClientIcon, toneClass } from '@/ui-kit';

import type { CardChipsProps } from './CardChips.types';

import { CARD } from '../../../config';

import s from './CardChips.module.scss';

export const CardChips = ({ chips }: CardChipsProps) => (
  <div className={s.chips}>
    {chips.map((chip, index) => (
      <span key={`${String(index)}-${chip.label ?? ''}`} className={s.chip}>
        {chip.icon !== null && <ClientIcon className={s.icon} icon={chip.icon} size={CARD.chipIcon} tone={chip.tone} />}
        {chip.label !== null && <span className={s.label}>{chip.label}</span>}
        <span className={clsx(s.value, toneClass(chip.tone))} style={chip.color === null ? undefined : { color: chip.color }}>
          {chip.value}
        </span>
      </span>
    ))}
  </div>
);

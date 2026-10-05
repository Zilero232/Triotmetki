import clsx from 'clsx';

import { ClientIcon, HudText, toneClass } from '@/ui-kit';

import type { CardRowLineProps } from './CardRowLine.types';

import { CARD } from '../../../../../config';

import s from './CardRowLine.module.scss';

export const CardRowLine = ({ row, icon }: CardRowLineProps) => (
  <div className={s.line}>
    {icon.icon !== null && <ClientIcon className={s.icon} icon={icon.icon} size={CARD.rowIcon} tone={icon.tone} />}
    <HudText className={s.label} text={row.label} />
    <HudText className={clsx(s.text, toneClass(row.text_tone))} text={row.text} />
    <HudText className={clsx(s.value, toneClass(row.tone))} color={row.color} text={row.value} />
    <HudText className={s.note} text={row.note} />
  </div>
);

import clsx from 'clsx';

import { ClientIcon, HudText, IndexMark, toneClass } from '@/ui-kit';

import type { CardHeaderProps } from './CardHeader.types';

import { CARD } from '../../../config';
import { hasCardBody } from '../../../lib/card-view';

import s from './CardHeader.module.scss';

export const CardHeader = ({ data }: CardHeaderProps) => {
  if (data.title === null && data.value === null) {
    return null;
  }

  return (
    <div className={clsx(s.header, hasCardBody(data) && s.divided)}>
      {data.icon !== null && <ClientIcon className={s.icon} icon={data.icon} size={CARD.headerIcon} tone='muted' />}
      {data.title !== null && <IndexMark muted className={s.index} />}
      <HudText className={s.title} text={data.title} />
      <HudText className={s.subtitle} text={data.subtitle} />
      <HudText className={clsx(s.value, toneClass(data.value_tone))} text={data.value} />
    </div>
  );
};

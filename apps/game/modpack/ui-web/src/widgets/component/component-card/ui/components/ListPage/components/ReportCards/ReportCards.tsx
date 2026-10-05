import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { toneClass } from '@/ui-kit';

import type { ReportCardsProps } from './ReportCards.types';

import { MARKS_REPORT_VIEW } from '../../../../../config';

import s from './ReportCards.module.scss';

export const ReportCards = ({ cards }: ReportCardsProps) => {
  const t = useT();

  return (
    <div className={s.cards}>
      {cards.map((card) => (
        <div key={card.key} className={s.card}>
          <span className={s.cardLabel}>
            {card.window === null ? t(MARKS_REPORT_VIEW.cardLabels[card.label]) : `${t(MARKS_REPORT_VIEW.cardLabels.trend)} ${card.window}`}
          </span>
          <span className={s.cardValue}>{card.value}</span>
          <span className={clsx(s.delta, toneClass(card.tone))}>{card.delta}</span>
        </div>
      ))}
    </div>
  );
};

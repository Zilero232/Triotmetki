import type { SectionCardsProps } from './SectionCards.types';

import { useSectionCards } from '../../model/hooks';
import { CardColumns } from '../components';

import s from './SectionCards.module.scss';

export const SectionCards = ({ section, columns, card }: SectionCardsProps) => {
  const page = useSectionCards({ section, columns });

  if (page.empty) {
    return null;
  }

  return (
    <div className={s.cards}>
      <CardColumns card={card} columns={page.columns} />
    </div>
  );
};

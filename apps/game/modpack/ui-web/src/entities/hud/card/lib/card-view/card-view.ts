import type { CardData, CardRowData } from '../../model/schemas';
import type { RowIcon } from './card-view.types';

import { CARD } from '../../config';

export const hasCardBody = (data: CardData): boolean => {
  const hasLists = data.rows.length > 0 || data.chips.length > 0 || data.strip.length > 0;

  return hasLists || data.footer !== null;
};

export const rowIcon = (row: CardRowData): RowIcon => {
  if (row.status === null) {
    return { icon: row.icon, tone: row.tone };
  }

  return CARD.status[row.status];
};

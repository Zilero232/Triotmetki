import type { CardSummaryModel } from '../../../lib/card-preview';

export type CardSummaryProps = {
  kind: 'checklist' | 'keys';
  summary: CardSummaryModel;
};

import type { ComponentType } from 'react';

import type { UiComponent, UiField } from '@/shared/api/protocol';

export type ColumnCard = {
  component: UiComponent;
  fields?: UiField[];
};

export type CardProps = ColumnCard;

export type CardColumn = {
  id: string;
  items: ColumnCard[];
};

export type CardColumnsProps = {
  columns: CardColumn[];
  card: ComponentType<CardProps>;
};

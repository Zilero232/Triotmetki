import type { ComponentType } from 'react';

import type { CardProps } from '../components';

export type SearchPageProps = {
  columns: number;
  card: ComponentType<CardProps>;
};

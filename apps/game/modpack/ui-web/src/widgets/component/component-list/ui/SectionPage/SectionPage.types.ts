import type { ComponentType, ReactNode } from 'react';

import type { UiSection } from '@/shared/api/protocol';

import type { CardProps } from '../components';

export type SectionPageProps = {
  section: UiSection;
  columns: number;
  card: ComponentType<CardProps>;
  intro?: ReactNode;
  fill?: boolean;
};

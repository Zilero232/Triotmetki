import type { UiState } from '@/shared/api/protocol';

import type { Section } from '../store';

export type ScrollTops = UiState['scroll'];

export type RememberScrollInput = {
  page: Section;
  top: number;
};

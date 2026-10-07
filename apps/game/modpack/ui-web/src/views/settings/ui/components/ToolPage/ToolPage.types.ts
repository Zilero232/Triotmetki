import type { ReactNode } from 'react';

import type { Section } from '@/entities/window/window-state';
import type { UiSection } from '@/shared/api/protocol';

export type ToolPageProps = {
  section: Section;
  children: ReactNode;
  strip?: UiSection;
};

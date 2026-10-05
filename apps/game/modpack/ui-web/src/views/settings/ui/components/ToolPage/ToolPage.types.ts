import type { ReactNode } from 'react';

import type { Section } from '@/entities/window/window-state';

export type ToolPageProps = {
  section: Section;
  children: ReactNode;
};

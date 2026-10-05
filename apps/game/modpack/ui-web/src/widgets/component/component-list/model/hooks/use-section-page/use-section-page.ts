import { useStore } from '@nanostores/react';

import { $components, componentsOf, isEnabled, useScrollMemory } from '@/entities/window/window-state';

import type { UseSectionPageInput } from './use-section-page.types';

import { splitColumns } from '../../../lib/columns';

export const useSectionPage = ({ section, columns }: UseSectionPageInput) => {
  const components = useStore($components);
  const scroll = useScrollMemory(section);
  const shown = componentsOf({ components, section });

  return {
    total: shown.length,
    enabled: shown.filter(isEnabled).length,
    empty: shown.length === 0,
    columns: splitColumns({ items: shown.map((component) => ({ component })), columns }),
    scroll
  };
};

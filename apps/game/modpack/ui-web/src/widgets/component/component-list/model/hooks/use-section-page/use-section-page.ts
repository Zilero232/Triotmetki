import { useStore } from '@nanostores/react';

import type { ContextFilter } from '@/entities/window/window-state';

import { $components, $view, componentsOf, isEnabled, setContextFilter, useScrollMemory, useT } from '@/entities/window/window-state';

import type { UseSectionPageInput } from './use-section-page.types';

import { CONTEXT_CHOICES } from '../../../config';
import { splitColumns } from '../../../lib/columns';
import { listsBothContexts } from '../../../lib/context-filter';

export const useSectionPage = ({ section, columns }: UseSectionPageInput) => {
  const t = useT();
  const components = useStore($components);
  const view = useStore($view);
  const scroll = useScrollMemory(section);
  const all = componentsOf({ components, section, context: 'all' });
  const showFilter = listsBothContexts(all);
  const shown = showFilter ? componentsOf({ components, section, context: view.context }) : all;

  return {
    total: all.length,
    enabled: all.filter(isEnabled).length,
    empty: all.length === 0,
    filteredEmpty: all.length > 0 && shown.length === 0,
    showFilter,
    context: view.context,
    contextItems: CONTEXT_CHOICES.map((choice) => ({ value: choice.value, label: t(choice.label) })),
    setContext: (context: ContextFilter) => setContextFilter(context),
    columns: splitColumns({ items: shown.map((component) => ({ component })), columns }),
    scroll
  };
};

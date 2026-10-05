import type { UiIconName } from '@/shared/lib/icon-sprite';

import type { CardLayout, CardLayoutInput, ChevronInput, PanelPreviewInput, PreviewPanel } from './card-layout.types';

const chevronOf = ({ hasEditor, open }: ChevronInput): UiIconName => {
  if (hasEditor) {
    return 'chevron-right';
  }

  return open ? 'chevron-up' : 'chevron-down';
};

export const cardLayout = ({ component, fields, isExpanded, forceOpen }: CardLayoutInput): CardLayout => {
  const shown = fields ?? component.fields;
  const basic = shown.filter(({ advanced }) => !advanced);
  const advanced = shown.filter(({ advanced: isAdvanced }) => isAdvanced === true);
  const hasListPage = component.page?.kind === 'list';
  const hasContent = shown.length > 0 || component.actions.length > 0 || hasListPage;
  const expandable = hasContent || component.panel;
  const open = expandable && (forceOpen || isExpanded);

  return {
    fields: basic,
    advanced,
    expandable,
    open,
    showEmpty: !hasContent,
    chevron: chevronOf({ hasEditor: Boolean(component.editor), open })
  };
};

export const panelPreview = ({ component, panels }: PanelPreviewInput): PreviewPanel | null => {
  if (!component.panel) {
    return null;
  }

  return panels.find(({ id }) => id === component.id) ?? null;
};

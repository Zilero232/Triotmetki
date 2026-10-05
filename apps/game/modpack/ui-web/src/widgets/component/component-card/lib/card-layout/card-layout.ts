import type { PanelPreviewInput, PreviewPanel } from './card-layout.types';

export const panelPreview = ({ component, panels }: PanelPreviewInput): PreviewPanel | null => {
  if (!component.panel) {
    return null;
  }

  return panels.find(({ id }) => id === component.id) ?? null;
};

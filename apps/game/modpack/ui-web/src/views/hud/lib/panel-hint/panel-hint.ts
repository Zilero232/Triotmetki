import type { LabelLayout } from '../label-layout';
import type { PanelHint } from './panel-hint.types';

export const panelHint = (hovered: LabelLayout | undefined): PanelHint | null => {
  const text = hovered?.panel.hint ?? '';

  return hovered && text ? { id: hovered.id, text, rect: hovered.rect } : null;
};

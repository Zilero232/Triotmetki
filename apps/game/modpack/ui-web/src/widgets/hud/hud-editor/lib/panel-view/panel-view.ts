import { sortBy } from 'remeda';

import { panelRect, stageBox } from '@/entities/hud/panel-layout';
import { remBox } from '@/shared/lib/css-unit';

import type {
  FitsInInput,
  PanelFit,
  PanelFitInput,
  PanelLayerInput,
  PanelLook,
  PanelLookInput,
  PanelTone,
  PanelToneInput,
  PlacedPanel,
  PlacedPanelsInput,
  StackedRect,
  StageFrame,
  StageFrameInput
} from './panel-view.types';

import { HUD_EDITOR } from '../../config';

const fitsIn = ({ size, limit }: FitsInInput): boolean => size.width >= limit.width && size.height >= limit.height;

export const panelFit = ({ rect, scale }: PanelFitInput): PanelFit => {
  const size = { width: rect.width * scale, height: rect.height * scale };

  if (fitsIn({ size, limit: HUD_EDITOR.fit.label })) {
    return 'label';
  }

  return fitsIn({ size, limit: HUD_EDITOR.fit.bare }) ? 'icon' : 'bare';
};

export const stackOrder = (items: StackedRect[]): Map<string, number> => {
  const largestFirst = sortBy(items, [({ rect }) => rect.width * rect.height, 'desc']);

  return new Map(largestFirst.map(({ id }, index) => [id, index + 1]));
};

export const panelLayer = ({ base, selected, hovered }: PanelLayerInput): number => {
  if (hovered) {
    return HUD_EDITOR.layer.hovered + base;
  }

  return selected ? HUD_EDITOR.layer.selected + base : base;
};

export const panelTone = ({ active, enabled }: PanelToneInput): PanelTone => {
  if (active) {
    return 'accent';
  }

  return enabled ? 'text' : 'muted';
};

export const stageWidthFor = (roomWidth: number): number => Math.floor(Math.max(roomWidth, HUD_EDITOR.stage.minWidth));

export const stageFrame = ({ screen, width }: StageFrameInput): StageFrame => {
  const scale = width / Math.max(screen.width, 1);
  const height = Math.round(screen.height * scale * 100) / 100;

  return { scale, style: remBox({ width, height }) };
};

export const placedPanels = ({ panels, showDisabled, live, screen }: PlacedPanelsInput): PlacedPanel[] =>
  panels
    .filter((panel) => panel.enabled || showDisabled)
    .map((panel) => ({ panel, rect: live?.id === panel.id ? live.rect : panelRect({ panel, screen }) }));

export const panelLook = ({ placed: { panel, rect }, scale, screen, order, selected, hovered }: PanelLookInput): PanelLook => {
  const isSelected = selected === panel.id;
  const isHovered = hovered === panel.id;
  const isActive = isSelected || isHovered;

  return {
    fit: panelFit({ rect, scale }),
    selected: isSelected,
    active: isActive,
    tone: panelTone({ active: isActive, enabled: panel.enabled }),
    style: { ...stageBox({ rect, screen }), zIndex: panelLayer({ base: order.get(panel.id) ?? 0, selected: isSelected, hovered: isHovered }) }
  };
};

import { clamp, sortBy } from 'remeda';

import { remBox } from '@/shared/lib/css-unit';

import type {
  FitsInInput,
  PanelFit,
  PanelFitInput,
  PanelLayerInput,
  PanelTone,
  PanelToneInput,
  StackedRect,
  StageFrame,
  StageFrameInput,
  StageWidthInput
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

export const stageWidthFor = ({ room, screen }: StageWidthInput): number => {
  const aspect = screen.width / Math.max(screen.height, 1);
  const widest = Math.min(HUD_EDITOR.stage.maxWidth, HUD_EDITOR.stage.maxHeight * aspect);

  return Math.floor(clamp(Math.min(room.width, room.height * aspect), { min: HUD_EDITOR.stage.minWidth, max: widest }));
};

export const stageFrame = ({ screen, width }: StageFrameInput): StageFrame => {
  const scale = width / Math.max(screen.width, 1);
  const height = Math.round(screen.height * scale * 100) / 100;

  return { scale, style: remBox({ width, height }) };
};

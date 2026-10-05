import type { HudPanel } from '@/shared/api/hud-protocol';

import type { DockItem } from '../dock';
import type { DockItemInput, LabelLayout, LabelStyle, LabelStyleInput, LayoutLabelsInput, OpacityOfInput, ScaleOfInput } from './label-layout.types';

import { HUD_OVERLAY } from '../../config';
import { placeRect, rectStyle } from '../anchor';
import { attachRect } from '../attach';
import { settledPanels, stackDocks } from '../dock';

const scaleOf = ({ panel, scales }: ScaleOfInput): number => scales[panel.id] ?? panel.scale;

const dockItem = ({ panel, scale, sizes, overrides, screen }: DockItemInput): DockItem => {
  const measured = sizes[panel.id];
  const size = { width: (measured?.width ?? 0) * scale, height: (measured?.height ?? 0) * scale };
  const override = overrides[panel.id];
  const attached = override ? null : panel.attach;

  return {
    id: panel.id,
    dock: override ? null : (panel.dock ?? null),
    upward: panel.align_y === 'bottom',
    align: panel.align_x,
    rect: attached ? attachRect({ attach: attached, size, screen }) : placeRect({ anchor: override ?? panel, size, screen })
  };
};

const opacityOf = ({ panel, settled }: OpacityOfInput): number => {
  if (!settled || !panel.visible) {
    return HUD_OVERLAY.hidden;
  }

  return panel.cover ? panel.alpha * HUD_OVERLAY.coverAlpha[panel.cover] : panel.alpha;
};

const takesInput = (panel: HudPanel): boolean => panel.visible && !panel.cover;

export const labelStyle = ({ rect, scale, opacity }: LabelStyleInput): LabelStyle => {
  const style = { ...rectStyle({ rect }), opacity };

  if (scale === 1) {
    return style;
  }

  return { ...style, transform: `scale(${scale})`, transformOrigin: HUD_OVERLAY.scaleOrigin };
};

export const layoutLabels = (input: LayoutLabelsInput): LabelLayout[] => {
  const { panels, sizes, scales, screen, live, edit, widgets } = input;
  const items = panels.map((panel) => dockItem({ ...input, panel, scale: scaleOf({ panel, scales }) }));
  const stacked = stackDocks({ items, screen, ...HUD_OVERLAY.dock });
  const settled = settledPanels({ items, measured: (id) => sizes[id] !== undefined });

  const layoutOf = (panel: HudPanel): LabelLayout => {
    const scale = scaleOf({ panel, scales });
    const placed = stacked.get(panel.id) ?? HUD_OVERLAY.emptyRect;
    const rect = live?.id === panel.id ? live.rect : placed;
    const opacity = opacityOf({ panel, settled: settled.has(panel.id) });
    const isEditable = takesInput(panel) && edit;

    return {
      panel,
      id: panel.id,
      rect,
      scale,
      button: takesInput(panel) && panel.kind === 'button',
      movable: isEditable && panel.drag,
      pointer: isEditable && Boolean(widgets.get(panel.id)?.pointer),
      style: labelStyle({ rect, scale, opacity })
    };
  };

  return panels.map(layoutOf);
};

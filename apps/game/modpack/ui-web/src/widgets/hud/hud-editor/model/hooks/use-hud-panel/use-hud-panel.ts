import { useT } from '@/entities/window/window-state';
import { useTooltip } from '@/shared/lib/use-tooltip';

import type { HudPanelModel, PointerPress } from '../use-hud-editor';

export const useHudPanel = (item: HudPanelModel) => {
  const t = useT();
  const { panel } = item;
  const tooltip = useTooltip(panel.enabled ? panel.title : `${panel.title} · ${t('hudDisabled')}`);

  return {
    title: tooltip.title,
    onMouseDown: (press: PointerPress) => {
      tooltip.onMouseDown?.();
      item.onMouseDown(press);
    },
    onMouseEnter: () => {
      tooltip.onMouseEnter?.();
      item.onMouseEnter();
    },
    onMouseLeave: () => {
      tooltip.onMouseLeave?.();
      item.onMouseLeave();
    }
  };
};

import { dragRect, moveMessage, panelRect, stageScale } from '@/entities/hud/panel-layout';

import type { NudgePanelInput, PressPanelInput, UsePanelMovesInput } from './use-panel-moves.types';

import { HUD_EDITOR } from '../../../config';
import { useStageDrag } from '../use-stage-drag';

export const usePanelMoves = ({ screenRef, stageRef, onSelect }: UsePanelMovesInput) => {
  const { live, moveNow, startDrag } = useStageDrag({ screenRef });

  const pressPanel = ({ panel, press }: PressPanelInput): void => {
    const screen = screenRef.current;
    const box = stageRef.current?.getBoundingClientRect();

    onSelect(panel.id);

    if (box) {
      const scale = stageScale({ screen, stage: { width: box.width, height: box.height } });

      startDrag({ id: panel.id, mouseX: press.clientX, mouseY: press.clientY, scale, rect: panelRect({ panel, screen }) });
    }
  };

  const nudgePanel = ({ panel, event }: NudgePanelInput): void => {
    const screen = screenRef.current;
    const step = HUD_EDITOR.nudge[event.key];

    if (!step) {
      return;
    }

    event.preventDefault();
    onSelect(panel.id);
    moveNow(moveMessage({ id: panel.id, rect: dragRect({ rect: panelRect({ panel, screen }), ...step, screen, grid: HUD_EDITOR.grid }), screen }));
  };

  return { live, pressPanel, nudgePanel };
};

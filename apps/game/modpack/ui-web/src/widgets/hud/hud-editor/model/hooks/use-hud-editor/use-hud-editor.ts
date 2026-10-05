import { useRef, useState } from 'react';

import type { ClientSize } from '@/shared/api/gameface';
import type { UiPanel } from '@/shared/api/protocol';

import { dragRect, moveMessage, panelRect, stageBox, stageScale } from '@/entities/hud/panel-layout';
import { gameface } from '@/shared/api/gameface';
import { send } from '@/shared/api/protocol';
import { designScreen, rootScale } from '@/shared/lib/design-screen';

import type { KeyPress, NudgePanelInput, PointerPress, PressPanelInput } from './use-hud-editor.types';

import { HUD_EDITOR } from '../../../config';
import { useStageDrag } from '../use-stage-drag';

export const useHudEditor = (panels: UiPanel[]) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<ClientSize>(HUD_EDITOR.defaultScreen);
  const [selected, setSelected] = useState<string | null>(null);
  const { live, moveNow, startDrag } = useStageDrag({ screenRef });

  screenRef.current = designScreen({ client: gameface.clientSize(), scale: rootScale(), fallback: HUD_EDITOR.defaultScreen });

  const screen = screenRef.current;

  const pressPanel = ({ panel, press }: PressPanelInput): void => {
    const box = stageRef.current?.getBoundingClientRect();

    setSelected(panel.id);

    if (box) {
      const scale = stageScale({ screen, stage: { width: box.width, height: box.height } });

      startDrag({ id: panel.id, mouseX: press.clientX, mouseY: press.clientY, scale, rect: panelRect({ panel, screen }) });
    }
  };

  const nudgePanel = ({ panel, event }: NudgePanelInput): void => {
    const step = HUD_EDITOR.nudge[event.key];

    if (!step) {
      return;
    }

    event.preventDefault();
    setSelected(panel.id);
    moveNow(moveMessage({ id: panel.id, rect: dragRect({ rect: panelRect({ panel, screen }), ...step, screen, grid: HUD_EDITOR.grid }), screen }));
  };

  return {
    stageRef,
    hasPanels: panels.length > 0,
    hasSelection: selected !== null,
    editOnScreen: () => send({ type: 'hud_edit', active: true }),
    resetAll: () => send({ type: 'hud_reset_all' }),
    resetSelected: () => {
      if (selected) {
        send({ type: 'hud_reset', panel: selected });
      }
    },
    panels: panels.map((panel) => ({
      panel,
      selected: selected === panel.id,
      style: stageBox({ rect: live?.id === panel.id ? live.rect : panelRect({ panel, screen }), screen }),
      onMouseDown: (press: PointerPress) => pressPanel({ panel, press }),
      onKeyDown: (event: KeyPress) => nudgePanel({ panel, event })
    }))
  };
};

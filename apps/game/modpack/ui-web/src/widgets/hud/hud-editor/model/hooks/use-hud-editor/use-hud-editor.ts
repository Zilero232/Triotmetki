import { useRef, useState } from 'react';

import type { ClientSize } from '@/shared/api/gameface';
import type { UiPanel } from '@/shared/api/protocol';

import { componentIcon } from '@/entities/window/window-state';
import { gameface } from '@/shared/api/gameface';
import { send } from '@/shared/api/protocol';
import { designScreen, rootScale } from '@/shared/lib/design-screen';

import type { KeyPress, PointerPress } from './use-hud-editor.types';

import { HUD_EDITOR } from '../../../config';
import { panelLook, placedPanels, stackOrder, stageFrame } from '../../../lib/panel-view';
import { usePanelMoves } from '../use-panel-moves';
import { useStageWidth } from '../use-stage-width';

export const useHudEditor = (panels: UiPanel[]) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<ClientSize>(HUD_EDITOR.defaultScreen);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showDisabled, setShowDisabled] = useState(false);
  const { live, pressPanel, nudgePanel } = usePanelMoves({ screenRef, stageRef, onSelect: setSelected });

  screenRef.current = designScreen({ client: gameface.clientSize(), scale: rootScale(), fallback: HUD_EDITOR.defaultScreen });

  const screen = screenRef.current;
  const { boxRef, width } = useStageWidth({ stageRef, screen });
  const frame = stageFrame({ screen, width });

  const placed = placedPanels({ panels, showDisabled, live, screen });
  const order = stackOrder(placed.map(({ panel, rect }) => ({ id: panel.id, rect })));

  return {
    boxRef,
    stageRef,
    stageStyle: frame.style,
    toolbarStyle: { width: frame.style.width },
    hasPanels: panels.length > 0,
    hasSelection: selected !== null,
    disabledCount: panels.filter((panel) => !panel.enabled).length,
    showDisabled,
    toggleDisabled: () => setShowDisabled((shown) => !shown),
    editOnScreen: () => send({ type: 'hud_edit', active: true }),
    resetAll: () => send({ type: 'hud_reset_all' }),
    resetSelected: () => {
      if (selected) {
        send({ type: 'hud_reset', panel: selected });
      }
    },
    panels: placed.map((item) => {
      const { panel } = item;

      return {
        panel,
        icon: componentIcon(panel.id),
        ...panelLook({ placed: item, scale: frame.scale, screen, order, selected, hovered }),
        onMouseDown: (press: PointerPress) => pressPanel({ panel, press }),
        onMouseEnter: () => setHovered(panel.id),
        onMouseLeave: () => setHovered((current) => (current === panel.id ? null : current)),
        onKeyDown: (event: KeyPress) => nudgePanel({ panel, event })
      };
    })
  };
};

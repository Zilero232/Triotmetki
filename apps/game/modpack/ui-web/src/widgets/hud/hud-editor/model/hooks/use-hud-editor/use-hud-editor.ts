import { useRef, useState } from 'react';

import type { ClientSize } from '@/shared/api/gameface';
import type { UiPanel } from '@/shared/api/protocol';

import { panelRect, stageBox } from '@/entities/hud/panel-layout';
import { componentIcon } from '@/entities/window/window-state';
import { gameface } from '@/shared/api/gameface';
import { send } from '@/shared/api/protocol';
import { designScreen, rootScale } from '@/shared/lib/design-screen';

import type { KeyPress, PlacedPanel, PointerPress } from './use-hud-editor.types';

import { HUD_EDITOR } from '../../../config';
import { panelFit, panelLayer, panelTone, stackOrder, stageFrame } from '../../../lib/panel-view';
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

  const placed: PlacedPanel[] = panels
    .filter((panel) => panel.enabled || showDisabled)
    .map((panel) => ({ panel, rect: live?.id === panel.id ? live.rect : panelRect({ panel, screen }) }));

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
    panels: placed.map(({ panel, rect }) => {
      const isSelected = selected === panel.id;
      const isHovered = hovered === panel.id;
      const isActive = isSelected || isHovered;

      return {
        panel,
        icon: componentIcon(panel.id),
        fit: panelFit({ rect, scale: frame.scale }),
        selected: isSelected,
        active: isActive,
        tone: panelTone({ active: isActive, enabled: panel.enabled }),
        style: { ...stageBox({ rect, screen }), zIndex: panelLayer({ base: order.get(panel.id) ?? 0, selected: isSelected, hovered: isHovered }) },
        onMouseDown: (press: PointerPress) => pressPanel({ panel, press }),
        onMouseEnter: () => setHovered(panel.id),
        onMouseLeave: () => setHovered((current) => (current === panel.id ? null : current)),
        onKeyDown: (event: KeyPress) => nudgePanel({ panel, event })
      };
    })
  };
};

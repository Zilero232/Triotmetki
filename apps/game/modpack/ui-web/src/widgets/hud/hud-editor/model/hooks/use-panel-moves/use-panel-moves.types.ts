import type { RefObject } from 'react';

import type { ClientSize } from '@/shared/api/gameface';
import type { UiPanel } from '@/shared/api/protocol';

export type PointerPress = Pick<MouseEvent, 'clientX' | 'clientY'>;

export type KeyPress = Pick<KeyboardEvent, 'key' | 'preventDefault'>;

export type UsePanelMovesInput = {
  screenRef: RefObject<ClientSize>;
  stageRef: RefObject<HTMLDivElement | null>;
  onSelect: (panelId: string) => void;
};

export type PressPanelInput = { panel: UiPanel; press: PointerPress };

export type NudgePanelInput = { panel: UiPanel; event: KeyPress };

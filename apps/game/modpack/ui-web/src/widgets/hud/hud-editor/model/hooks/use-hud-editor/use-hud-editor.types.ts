import type { UiPanel } from '@/shared/api/protocol';

import type { useHudEditor } from './use-hud-editor';

export type PointerPress = Pick<MouseEvent, 'clientX' | 'clientY'>;

export type KeyPress = Pick<KeyboardEvent, 'key' | 'preventDefault'>;

export type HudPanelModel = ReturnType<typeof useHudEditor>['panels'][number];

export type PressPanelInput = { panel: UiPanel; press: PointerPress };

export type NudgePanelInput = { panel: UiPanel; event: KeyPress };

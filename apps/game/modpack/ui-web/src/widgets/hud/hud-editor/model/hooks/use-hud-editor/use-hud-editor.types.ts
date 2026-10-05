import type { Rect } from '@/entities/hud/panel-layout';
import type { UiPanel } from '@/shared/api/protocol';

import type { useHudEditor } from './use-hud-editor';

export type { KeyPress, PointerPress } from '../use-panel-moves';

export type HudPanelModel = ReturnType<typeof useHudEditor>['panels'][number];

export type PlacedPanel = { panel: UiPanel; rect: Rect };

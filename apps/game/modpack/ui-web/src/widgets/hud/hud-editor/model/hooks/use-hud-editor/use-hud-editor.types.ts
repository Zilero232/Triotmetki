import type { useHudEditor } from './use-hud-editor';

export type { KeyPress, PointerPress } from '../use-panel-moves';

export type HudPanelModel = ReturnType<typeof useHudEditor>['panels'][number];

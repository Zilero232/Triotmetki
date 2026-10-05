import type { HudPanel, HudState } from '@/shared/api/hud-protocol';

export type SharePanelsInput = {
  previous: HudState | null;
  next: HudState;
};

export type RememberInput<Value> = {
  cache: WeakMap<HudPanel, Value>;
  panel: HudPanel;
  build: () => Value;
};

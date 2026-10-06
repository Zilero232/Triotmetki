import type { HudPanel, HudState } from '@/shared/api/hud-protocol';

export type SharePanelsInput = {
  previous: HudState | null;
  next: HudState;
};

export type SharedPanelInput = {
  old: HudPanel | undefined;
  panel: HudPanel;
};

export type RememberCache<Key, Value> = {
  get: (key: Key) => Value | undefined;
  set: (key: Key, value: Value) => unknown;
};

export type RememberInput<Value, Key = object> = {
  cache: RememberCache<Key, Value>;
  key: Key;
  build: () => Value;
};

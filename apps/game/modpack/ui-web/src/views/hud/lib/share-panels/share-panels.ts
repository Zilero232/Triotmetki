import { isDeepEqual } from 'remeda';

import type { HudPanel, HudState } from '@/shared/api/hud-protocol';

import type { RememberInput, SharedPanelInput, SharePanelsInput } from './share-panels.types';

const sharedPanel = ({ old, panel }: SharedPanelInput): HudPanel => {
  if (!old) {
    return panel;
  }

  const isSameWidget = isDeepEqual(old.widget, panel.widget);
  const candidate = isSameWidget && old.widget !== panel.widget ? { ...panel, widget: old.widget } : panel;

  return isDeepEqual(old, candidate) ? old : candidate;
};

export const sharePanels = ({ previous, next }: SharePanelsInput): HudState => {
  if (previous === null) {
    return next;
  }

  const known = new Map(previous.panels.map((panel) => [panel.id, panel]));
  const panels = next.panels.map((panel) => sharedPanel({ old: known.get(panel.id), panel }));

  const unchanged =
    previous.cursor === next.cursor &&
    previous.edit === next.edit &&
    panels.length === previous.panels.length &&
    panels.every((panel, index) => panel === previous.panels[index]);

  return unchanged ? previous : { ...next, panels };
};

export const clearedRecord = <Value>(current: Partial<Record<string, Value>>): Partial<Record<string, Value>> =>
  Object.keys(current).length === 0 ? current : {};

export const remember = <Value, Key>({ cache, key, build }: RememberInput<Value, Key>): Value => {
  const known = cache.get(key);

  if (known !== undefined) {
    return known;
  }

  const value = build();

  cache.set(key, value);

  return value;
};

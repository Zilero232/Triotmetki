import { isDeepEqual } from 'remeda';

import type { HudState } from '@/shared/api/hud-protocol';

import type { RememberInput, SharePanelsInput } from './share-panels.types';

export const sharePanels = ({ previous, next }: SharePanelsInput): HudState => {
  if (previous === null) {
    return next;
  }

  const known = new Map(previous.panels.map((panel) => [panel.id, panel]));
  const panels = next.panels.map((panel) => {
    const old = known.get(panel.id);

    return old && isDeepEqual(old, panel) ? old : panel;
  });

  const unchanged =
    previous.cursor === next.cursor &&
    previous.edit === next.edit &&
    panels.length === previous.panels.length &&
    panels.every((panel, index) => panel === previous.panels[index]);

  return unchanged ? previous : { ...next, panels };
};

export const clearedRecord = <Value>(current: Partial<Record<string, Value>>): Partial<Record<string, Value>> =>
  Object.keys(current).length === 0 ? current : {};

export const remember = <Value>({ cache, panel, build }: RememberInput<Value>): Value => {
  const known = cache.get(panel);

  if (known !== undefined) {
    return known;
  }

  const value = build();

  cache.set(panel, value);

  return value;
};

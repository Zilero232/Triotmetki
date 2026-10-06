import { isDeepEqual } from 'remeda';

import type { Measured } from '@/entities/hud/panel-layout';

import { stickySize } from '@/entities/hud/panel-layout';

import type { ChangedPanelsInput, PanelContent, ReadSizeInput, SameContentInput, SettleSizesInput, Sizes } from './panel-sizes.types';

export const settleSizes = ({ current, readings }: SettleSizesInput): Sizes => {
  const measured: Sizes = { ...current };
  let isChanged = false;

  readings.forEach((next, id) => {
    const size = stickySize({ previous: current[id], next });

    measured[id] = size;
    isChanged = isChanged || !isDeepEqual(current[id], size);
  });

  return isChanged ? measured : current;
};

const isSameContent = ({ previous, next, id }: SameContentInput): boolean =>
  previous.lines.get(id) === next.lines.get(id) && previous.widgets.get(id) === next.widgets.get(id);

export const changedPanels = ({ previous, next }: ChangedPanelsInput): string[] =>
  [...next.lines.keys()].filter((id) => !isSameContent({ previous, next, id }));

export const readSize = ({ element, lines, scale }: ReadSizeInput): Measured | null => {
  if (!element || element.offsetWidth <= 0 || element.offsetHeight <= 0) {
    return null;
  }

  return { lines, width: element.offsetWidth / scale, height: element.offsetHeight / scale };
};

export const emptyContent = (): PanelContent => ({ lines: new Map(), widgets: new Map() });

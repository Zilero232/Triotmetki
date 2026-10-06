import { isDeepEqual } from 'remeda';

import type { Measured } from '@/entities/hud/panel-layout';

import { screenScale, stickySize } from '@/entities/hud/panel-layout';
import { widgetLines } from '@/features/hud/widget-registry';

import type {
  ChangedPanelsInput,
  ElementRef,
  ElementRefInput,
  LineCountInput,
  PanelContent,
  ReadCountdownInput,
  ReadSizeInput,
  SameContentInput,
  SettleSizesInput,
  Sizes
} from './panel-sizes.types';

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

const lineCount = ({ id, content }: LineCountInput): number => {
  const widget = content.widgets.get(id);

  return widget ? widgetLines(widget) : (content.lines.get(id)?.length ?? 0);
};

export const readCountdown = ({ framesLeft, elements, content }: ReadCountdownInput): Map<string, Measured> => {
  const scale = screenScale();
  const readings = new Map<string, Measured>();

  framesLeft.forEach((left, id) => {
    const size = readSize({ element: elements.get(id), lines: lineCount({ id, content }), scale });

    if (size) {
      readings.set(id, size);
    }

    if (left > 1) {
      framesLeft.set(id, left - 1);
    } else {
      framesLeft.delete(id);
    }
  });

  return readings;
};

export const elementRef =
  ({ elements, id }: ElementRefInput): ElementRef =>
  (element) => {
    if (element) {
      elements.set(id, element);
    } else {
      elements.delete(id);
    }
  };

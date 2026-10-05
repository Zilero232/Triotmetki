import { groupBy, sortBy, sumBy } from 'remeda';

import type { Rect } from '@/entities/hud/panel-layout';

import { clampRect } from '@/entities/hud/panel-layout';

import type {
  Column,
  ColumnItemInput,
  LiftInput,
  LimitInput,
  OverflowInput,
  OverlapInput,
  PlaceNextInput,
  RoofInput,
  SettledPanelsInput,
  StackDocksInput,
  StackGroupInput
} from './dock.types';

const startColumn = (rect: Rect): Column => ({ first: rect, previous: rect, widest: rect.width });

const nextTop = ({ column, item, gap }: ColumnItemInput): number =>
  item.upward ? column.previous.top - gap - item.rect.height : column.previous.top + column.previous.height + gap;

const overflows = ({ top, height, upward, limit }: OverflowInput): boolean => (upward ? top < limit : top + height > limit);

const nextColumnLeft = ({ column, item, gap }: ColumnItemInput): number =>
  item.align === 'right' ? column.first.left - gap - item.rect.width : column.first.left + column.widest + gap;

const inColumn = ({ column, item }: Omit<ColumnItemInput, 'gap'>): number => {
  if (item.align === 'center') {
    return column.first.left + (column.first.width - item.rect.width) / 2;
  }

  return item.align === 'right' ? column.first.left + column.first.width - item.rect.width : column.first.left;
};

const bottomLimit = ({ item, screen, reserve }: LimitInput): number => screen.height - (item.dock?.reserve ?? reserve);

const overlapsX = ({ rect, other }: OverlapInput): boolean => rect.left < other.left + other.width && other.left < rect.left + rect.width;

const roofOf = ({ first, free, gap, ceiling }: RoofInput): number =>
  free
    .filter((rect) => overlapsX({ rect, other: first.rect }) && rect.top < first.rect.top)
    .reduce((roof, rect) => Math.max(roof, rect.top + rect.height + gap), Math.min(first.dock?.ceiling ?? ceiling, first.rect.top));

const liftedTop = ({ members, free, screen, gap, reserve, ceiling }: LiftInput): number | null => {
  const [first] = members;

  if (!first || first.upward) {
    return null;
  }

  const total = sumBy(members, (item) => item.rect.height) + gap * (members.length - 1);
  const limit = bottomLimit({ item: first, screen, reserve });

  return first.rect.top + total > limit ? Math.max(roofOf({ first, free, gap, ceiling }), limit - total) : null;
};

const placeNext = ({ column, item, gap, screen, reserve }: PlaceNextInput): Column => {
  const limit = item.upward ? (item.dock?.reserve ?? reserve) : bottomLimit({ item, screen, reserve });
  const top = nextTop({ column, item, gap });
  const wraps = overflows({ top, height: item.rect.height, upward: item.upward, limit });
  const left = wraps ? nextColumnLeft({ column, item, gap }) : inColumn({ column, item });
  const rect = clampRect({ rect: { ...item.rect, left, top: wraps ? column.first.top : top }, screen });

  return wraps ? startColumn(rect) : { ...column, previous: rect, widest: Math.max(column.widest, rect.width) };
};

const stackGroup = ({ members, lifted, placed, screen, gap, reserve }: StackGroupInput): void => {
  const [first, ...rest] = members;

  if (!first) {
    return;
  }

  const start = lifted === null ? first.rect : { ...first.rect, top: lifted };

  placed.set(first.id, start);

  rest.reduce((column, item) => {
    const next = placeNext({ column, item, gap, screen, reserve });

    placed.set(item.id, next.previous);

    return next;
  }, startColumn(start));
};

export const stackDocks = ({ items, screen, gap, reserve, ceiling }: StackDocksInput): Map<string, Rect> => {
  const placed = new Map(items.map((item) => [item.id, item.rect]));
  const docked = items.filter((item) => item.dock !== null);
  const free = items.filter((item) => item.dock === null).map((item) => item.rect);
  const groups = groupBy(docked, (item) => item.dock?.group ?? '');

  Object.values(groups).forEach((unsorted) => {
    const members = sortBy(unsorted, (item) => item.dock?.order ?? 0);
    const lifted = liftedTop({ members, free, screen, gap, reserve, ceiling });

    stackGroup({ members, lifted, placed, screen, gap, reserve });
  });

  return placed;
};

export const settledPanels = ({ items, measured }: SettledPanelsInput): Set<string> => {
  const waiting = new Set(items.filter((item) => item.dock !== null && !measured(item.id)).map((item) => item.dock?.group));

  return new Set(items.filter((item) => measured(item.id) && !(item.dock && waiting.has(item.dock.group))).map((item) => item.id));
};

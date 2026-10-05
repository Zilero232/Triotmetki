import { describe, expect, it } from 'vitest';

import type { Rect } from '@/entities/hud/panel-layout';
import type { HudDock } from '@/shared/api/hud-protocol';

import type { DockItem } from '../dock.types';

import { stackDocks } from '../dock';

type Box = { left: number; top: number; height: number; width?: number };

type ItemInput = {
  id: string;
  order: number;
  box: Box;
  upward?: boolean;
  align?: DockItem['align'];
  group?: string;
  reserve?: number;
};

const SCREEN = { width: 1920, height: 1080 };

const rect = ({ left, top, height, width = 260 }: Box) => ({ left, top, width, height });

const item = ({ id, order, box, upward = false, align = 'left', group = 'left', reserve }: ItemInput): DockItem => ({
  id,
  dock: { group, order, reserve },
  upward,
  align,
  rect: rect(box)
});

const undocked = ({ id, box, align = 'left' }: { id: string; box: Box; align?: DockItem['align'] }): DockItem => ({
  id,
  dock: null,
  upward: false,
  align,
  rect: rect(box)
});

const layout = ({ items, ceiling = 80, obstacles = [] }: { items: DockItem[]; ceiling?: number; obstacles?: Rect[] }) => ({
  screen: SCREEN,
  gap: 6,
  reserve: 190,
  ceiling,
  items,
  obstacles
});

const TALL_LEFT_COLUMN = [
  item({ id: 'a', order: 0, box: { left: 16, top: 440, height: 300 } }),
  item({ id: 'b', order: 1, box: { left: 16, top: 440, height: 200, width: 240 } })
];

const RIGHT_COLUMN_WITH_A_MOVED_PANEL = [
  undocked({ id: 'moved', box: { left: 100, top: 100, height: 50 } }),
  item({ id: 'first', order: 0, box: { left: 1644, top: 100, height: 60 }, align: 'right', group: 'right' }),
  item({ id: 'second', order: 1, box: { left: 1684, top: 100, height: 60, width: 220 }, align: 'right', group: 'right' })
];

describe(stackDocks, () => {
  it('stacks a top-anchored column downwards in order, whatever order the panels come in', () => {
    const items = [
      item({ id: 'b', order: 1, box: { left: 16, top: 440, height: 60 } }),
      item({ id: 'a', order: 0, box: { left: 16, top: 440, height: 100 } }),
      item({ id: 'c', order: 2, box: { left: 16, top: 440, height: 40 } })
    ];

    const placed = stackDocks(layout({ items }));

    expect(['a', 'b', 'c'].map((id) => placed.get(id)?.top)).toEqual([440, 546, 612]);
  });

  it('stacks a bottom-anchored column upwards', () => {
    const items = [
      item({ id: 'log', order: 0, box: { left: 232, top: 924, height: 150 }, upward: true }),
      item({ id: 'marks', order: 1, box: { left: 232, top: 1014, height: 60 }, upward: true })
    ];

    const placed = stackDocks({ ...layout({ items }), reserve: 0 });

    expect(placed.get('marks')?.top).toBe(858);
  });

  it('moves a column that does not fit up first, never above the ceiling', () => {
    const placed = stackDocks(layout({ items: TALL_LEFT_COLUMN }));

    expect(placed.get('a')?.top).toBe(384);
    expect(placed.get('b')).toEqual({ left: 16, top: 690, width: 240, height: 200 });
  });

  it('starts a new column to the right of a left column when even the lifted one crosses the reserved bottom strip', () => {
    const placed = stackDocks(layout({ items: TALL_LEFT_COLUMN, ceiling: 400 }));

    expect(placed.get('b')).toEqual({ left: 282, top: 400, width: 240, height: 200 });
  });

  it('starts a new column to the left of a right column when even the lifted one crosses the reserved bottom strip', () => {
    const items = [
      item({ id: 'a', order: 0, box: { left: 1644, top: 570, height: 300 }, align: 'right' }),
      item({ id: 'b', order: 1, box: { left: 1664, top: 570, height: 100, width: 240 }, align: 'right' })
    ];

    const placed = stackDocks(layout({ items, ceiling: 570 }));

    expect(placed.get('b')).toEqual({ left: 1398, top: 570, width: 240, height: 100 });
  });

  it('lines a right-anchored column up on its right edge', () => {
    const placed = stackDocks(layout({ items: RIGHT_COLUMN_WITH_A_MOVED_PANEL }));

    expect(placed.get('second')).toEqual({ left: 1684, top: 166, width: 220, height: 60 });
  });

  it('leaves a moved panel where the player put it', () => {
    const placed = stackDocks(layout({ items: RIGHT_COLUMN_WITH_A_MOVED_PANEL }));

    expect(placed.get('moved')?.top).toBe(100);
  });

  it('keeps a centred column centred', () => {
    const items = [
      item({ id: 'a', order: 0, box: { left: 830, top: 60, height: 80 }, align: 'center', group: 'top', reserve: 700 }),
      item({ id: 'b', order: 1, box: { left: 850, top: 60, height: 60, width: 220 }, align: 'center', group: 'top', reserve: 700 })
    ];

    const placed = stackDocks(layout({ items }));

    expect(placed.get('b')).toEqual({ left: 850, top: 146, width: 220, height: 60 });
  });

  it('lifts a column above the reserve its group carries instead of the default one', () => {
    const items = [
      item({ id: 'a', order: 0, box: { left: 8, top: 548, height: 100 }, reserve: 360 }),
      item({ id: 'b', order: 1, box: { left: 8, top: 548, height: 100 }, reserve: 360 })
    ];

    const placed = stackDocks(layout({ items }));

    expect(placed.get('a')?.top).toBe(514);
    expect(placed.get('b')).toEqual({ left: 8, top: 620, width: 260, height: 100 });
  });

  it('never lifts a column into an undocked panel above it', () => {
    const items = [
      undocked({ id: 'clock', box: { left: 1644, top: 76, height: 150 }, align: 'right' }),
      item({ id: 'a', order: 0, box: { left: 1644, top: 570, height: 350 }, align: 'right' }),
      item({ id: 'b', order: 1, box: { left: 1644, top: 570, height: 350 }, align: 'right' })
    ];

    const placed = stackDocks(layout({ items }));

    expect(placed.get('a')?.top).toBe(232);
  });

  it('keeps a column whose group forbids lifting at its anchor and wraps it instead', () => {
    const pinned = ({ id, order }: { id: string; order: number }): DockItem => {
      const dock: HudDock = { group: 'mid', order, reserve: 360, ceiling: 548 };

      return { ...item({ id, order, box: { left: 8, top: 548, height: 120 } }), dock };
    };

    const placed = stackDocks(layout({ items: [pinned({ id: 'a', order: 0 }), pinned({ id: 'b', order: 1 })] }));

    expect(placed.get('a')?.top).toBe(548);
    expect(placed.get('b')).toEqual({ left: 274, top: 548, width: 260, height: 120 });
  });

  it('lifts a bottom column over a panel that follows a stock element', () => {
    const items = [item({ id: 'log', order: 0, box: { left: 232, top: 618, height: 143, width: 362 }, upward: true })];
    const equipment = { left: 382, top: 647, width: 292, height: 56 };

    const placed = stackDocks(layout({ items, obstacles: [equipment] }));

    expect(placed.get('log')?.top).toBe(647 - 6 - 143);
  });

  it('drops a top column below a panel that follows a stock element', () => {
    const items = [item({ id: 'platoon', order: 0, box: { left: 372, top: 60, height: 76, width: 248 } })];
    const progress = { left: 559, top: 52, width: 248, height: 71 };

    const placed = stackDocks(layout({ items, obstacles: [progress] }));

    expect(placed.get('platoon')?.top).toBe(52 + 71 + 6);
  });

  it('keeps a column where it is when nothing is in its way', () => {
    const items = [item({ id: 'log', order: 0, box: { left: 232, top: 930, height: 143, width: 362 }, upward: true })];

    const placed = stackDocks(layout({ items, obstacles: [{ left: 760, top: 1022, width: 399, height: 58 }] }));

    expect(placed.get('log')?.top).toBe(930);
  });

  it('steps past every obstacle in its way', () => {
    const items = [item({ id: 'log', order: 0, box: { left: 232, top: 618, height: 143, width: 362 }, upward: true })];
    const obstacles = [
      { left: 483, top: 710, width: 400, height: 58 },
      { left: 382, top: 600, width: 292, height: 56 }
    ];

    const placed = stackDocks(layout({ items, obstacles }));

    expect(placed.get('log')?.top).toBe(600 - 6 - 143);
  });
});

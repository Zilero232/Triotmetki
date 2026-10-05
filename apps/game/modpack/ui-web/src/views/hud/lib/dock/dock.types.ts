import type { Rect, Size } from '@/entities/hud/panel-layout';
import type { HudDock, HudPanel } from '@/shared/api/hud-protocol';

export type DockItem = { id: string; dock: HudDock | null; upward: boolean; align: HudPanel['align_x']; rect: Rect };

export type StackDocksInput = { items: DockItem[]; obstacles?: Rect[]; screen: Size; gap: number; reserve: number; ceiling: number };

export type LiftInput = { members: DockItem[]; free: Rect[]; screen: Size; gap: number; reserve: number; ceiling: number };

export type LimitInput = { item: DockItem; screen: Size; reserve: number };

export type SettledPanelsInput = { items: DockItem[]; measured: (id: string) => boolean };

export type RoofInput = { first: DockItem; free: Rect[]; gap: number; ceiling: number };

export type Column = { first: Rect; previous: Rect; widest: number };

export type ColumnItemInput = { column: Column; item: DockItem; gap: number };

export type OverflowInput = { top: number; height: number; upward: boolean; limit: number };

export type OverlapInput = { rect: Rect; other: Rect };

export type PlaceNextInput = ColumnItemInput & { screen: Size; reserve: number };

export type StackGroupInput = {
  members: DockItem[];
  lifted: number | null;
  obstacles: Rect[];
  placed: Map<string, Rect>;
  screen: Size;
  gap: number;
  reserve: number;
};

export type ClearInput = { rect: Rect; upward: boolean; obstacles: Rect[]; gap: number; screen: Size };

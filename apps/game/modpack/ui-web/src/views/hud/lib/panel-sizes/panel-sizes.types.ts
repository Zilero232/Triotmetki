import type { Measured } from '@/entities/hud/panel-layout';
import type { ResolvedWidget } from '@/features/hud/widget-registry';
import type { RichLine } from '@/shared/lib/rich-text';

export type Sizes = Partial<Record<string, Measured>>;

export type PanelContent = {
  lines: Map<string, RichLine[]>;
  widgets: Map<string, ResolvedWidget | null>;
};

export type SettleSizesInput = { current: Sizes; readings: Map<string, Measured> };

export type ChangedPanelsInput = { previous: PanelContent; next: PanelContent };

export type SameContentInput = ChangedPanelsInput & { id: string };

export type ReadSizeInput = { element: HTMLElement | undefined; lines: number; scale: number };

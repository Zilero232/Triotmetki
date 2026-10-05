import type { Measured } from '@/entities/hud/panel-layout';
import type { ResolvedWidget } from '@/features/hud/widget-registry';
import type { RichLine } from '@/shared/lib/rich-text';

export type Sizes = Partial<Record<string, Measured>>;

export type MeasureRef = (element: HTMLElement | null) => void;

export type UsePanelSizesInput = {
  lines: Map<string, RichLine[]>;
  widgets: Map<string, ResolvedWidget | null>;
};

export type SettleInput = { current: Sizes; readings: Map<string, Measured> };

import type { HudWidget } from '@/shared/api/hud-protocol';

import { HUD_PROTOCOL } from '@/shared/api/hud-protocol';
import { fontSafeData } from '@/shared/lib/font-safe';
import { isRecord } from '@/shared/lib/is-record';

import type { CountRowsInput, ResolvedWidget } from './widget-registry.types';

import { WIDGET_LINES } from '../../config';
import { WIDGET_ENTRIES } from './widget-entries';

const byKind = new Map(WIDGET_ENTRIES.map((entry) => [entry.kind, entry]));

export const resolveWidget = (widget: HudWidget | null | undefined): ResolvedWidget | null => {
  const entry = widget && widget.v === HUD_PROTOCOL.widgetVersion ? byKind.get(widget.kind) : undefined;

  return (entry && widget ? entry.parse(fontSafeData(widget.data)) : undefined) ?? null;
};

const countRows = ({ value, depth }: CountRowsInput): number => {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (!isRecord(value) || depth <= 0) {
    return 0;
  }

  return Object.values(value).reduce<number>((total, item) => total + countRows({ value: item, depth: depth - 1 }), 0);
};

export const widgetLines = ({ data }: ResolvedWidget): number => WIDGET_LINES.base + countRows({ value: data, depth: WIDGET_LINES.depth });

export const widgetKinds = (): string[] => [...byKind.keys()];

import { useMemo, useRef } from 'react';

import type { ResolvedWidget } from '@/features/hud/widget-registry';
import type { HudState, HudWidget } from '@/shared/api/hud-protocol';
import type { RichLine } from '@/shared/lib/rich-text';

import { resolveWidget } from '@/features/hud/widget-registry';
import { fontSafeLines } from '@/shared/lib/font-safe';
import { parseRichText } from '@/shared/lib/rich-text';

import { remember } from '../../../lib/share-panels';

export const usePanelContent = (state: HudState | null) => {
  const linesCacheRef = useRef(new Map<string, RichLine[]>());
  const widgetsCacheRef = useRef(new WeakMap<HudWidget, ResolvedWidget | null>());
  const panels = useMemo(() => state?.panels ?? [], [state]);

  const lines = useMemo(() => {
    const previous = linesCacheRef.current;
    const cache = new Map<string, RichLine[]>();
    const linesOf = (text: string): RichLine[] =>
      remember({ cache, key: text, build: () => previous.get(text) ?? fontSafeLines(parseRichText(text)) });

    const byId = new Map(panels.map((panel) => [panel.id, linesOf(panel.text)]));

    linesCacheRef.current = cache;

    return byId;
  }, [panels]);

  const widgets = useMemo(() => {
    const resolved = (widget: HudWidget | null): ResolvedWidget | null =>
      widget && remember({ cache: widgetsCacheRef.current, key: widget, build: () => resolveWidget(widget) });

    return new Map(panels.map((panel) => [panel.id, resolved(panel.widget)]));
  }, [panels]);

  return { panels, lines, widgets };
};

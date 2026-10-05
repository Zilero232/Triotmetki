import { useMemo, useRef } from 'react';

import type { ResolvedWidget } from '@/features/hud/widget-registry';
import type { HudPanel, HudState } from '@/shared/api/hud-protocol';
import type { RichLine } from '@/shared/lib/rich-text';

import { resolveWidget } from '@/features/hud/widget-registry';
import { fontSafeLines } from '@/shared/lib/font-safe';
import { parseRichText } from '@/shared/lib/rich-text';

import { remember } from '../../../lib/share-panels';

export const usePanelContent = (state: HudState | null) => {
  const linesCacheRef = useRef(new WeakMap<HudPanel, RichLine[]>());
  const widgetsCacheRef = useRef(new WeakMap<HudPanel, ResolvedWidget | null>());
  const panels = useMemo(() => state?.panels ?? [], [state]);

  const lines = useMemo(
    () =>
      new Map(
        panels.map((panel) => [panel.id, remember({ cache: linesCacheRef.current, panel, build: () => fontSafeLines(parseRichText(panel.text)) })])
      ),
    [panels]
  );

  const widgets = useMemo(
    () => new Map(panels.map((panel) => [panel.id, remember({ cache: widgetsCacheRef.current, panel, build: () => resolveWidget(panel.widget) })])),
    [panels]
  );

  return { panels, lines, widgets };
};

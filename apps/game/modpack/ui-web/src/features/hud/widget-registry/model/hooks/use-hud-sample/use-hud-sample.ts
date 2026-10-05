import { useMemo } from 'react';

import { fontSafeLines } from '@/shared/lib/font-safe';
import { parseRichText } from '@/shared/lib/rich-text';

import type { UseHudSampleInput } from './use-hud-sample.types';

import { resolveWidget } from '../../../lib/widget-registry';

export const useHudSample = ({ widget, text }: UseHudSampleInput) => {
  const resolved = useMemo(() => resolveWidget(widget), [widget]);
  const lines = useMemo(() => fontSafeLines(parseRichText(text ?? '')), [text]);

  const hasText = lines.some((line) => line.runs.length > 0);

  return { widget: resolved, lines, isEmpty: resolved === null && !hasText };
};

import { deltaText, percentText } from '@/shared/lib/format-number';
import { useTween } from '@/shared/lib/use-tween';

import type { MarksPanelView } from '../../../lib/marks-panel-view';
import type { MarksHeadState } from './use-marks-head.types';

import { MARKS_PANEL } from '../../../config';
import { usePulse } from '../use-pulse';

export const useMarksHead = (view: MarksPanelView): MarksHeadState => {
  const percent = useTween({ value: view.projected, step: MARKS_PANEL.steps.percent });
  const delta = useTween({ value: view.deltaValue, step: MARKS_PANEL.steps.percent });

  return { percent: percentText(percent), delta: deltaText({ value: delta, unit: false }), pulse: usePulse(view.milestone) };
};

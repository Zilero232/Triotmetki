import { formatNumber } from '@/shared/lib/format-number';
import { useTween } from '@/shared/lib/use-tween';

import { MARKS_PANEL } from '../../../config';

export const useCountText = (value: number): string => formatNumber(useTween({ value, step: MARKS_PANEL.steps.damage }) ?? value);

import type { ClipInput, PredictionState, PredictionWinnerInput } from './prediction.types';

import { parseJsonText } from '../../../../../common/lib';
import { PREDICTIONS } from '../../config/predictions.constants';
import { predictionStateSchema } from './prediction.schemas';

export const predictionThreshold = (avgDamage: number | null): number =>
  avgDamage === null || !Number.isFinite(avgDamage) || avgDamage <= 0
    ? PREDICTIONS.defaultThreshold
    : Math.max(PREDICTIONS.minThreshold, Math.round(avgDamage / PREDICTIONS.thresholdStep) * PREDICTIONS.thresholdStep);

export const predictionWinner = ({ state, damage }: PredictionWinnerInput): string => (damage >= state.threshold ? state.yesId : state.noId);

export const clipText = ({ text, max }: ClipInput): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export const readPredictionState = (raw: string | null): PredictionState | null =>
  raw === null ? null : (predictionStateSchema.safeParse(parseJsonText(raw)).data ?? null);

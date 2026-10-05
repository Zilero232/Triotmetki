import type { z } from 'zod';

import type { predictionJobSchema, predictionStateSchema } from './prediction.schemas';

export type PredictionState = z.infer<typeof predictionStateSchema>;
export type PredictionJob = z.infer<typeof predictionJobSchema>;

export type PredictionWinnerInput = {
  state: PredictionState;
  damage: number;
};

export type ClipInput = {
  text: string;
  max: number;
};

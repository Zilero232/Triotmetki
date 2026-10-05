import * as z from 'zod/mini';

import type { AdvicePayload } from './advice-payload.types';

import { PRESET_ADVISOR } from '../../config';

const payloadSchema = z.object({
  v: z.literal(PRESET_ADVISOR.payloadVersion),
  tankId: z.number(),
  items: z.array(z.number()),
  label: z.string()
});

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const parseAdvicePayload = (text: unknown): AdvicePayload | null => {
  if (typeof text !== 'string' || text === '') {
    return null;
  }

  const parsed = payloadSchema.safeParse(parseJson(text));

  return parsed.success ? { tankId: parsed.data.tankId, items: parsed.data.items, label: parsed.data.label } : null;
};

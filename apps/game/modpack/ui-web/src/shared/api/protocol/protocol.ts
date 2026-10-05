import { gameface } from '@/shared/api/gameface';

import type { UiFeed, UiMessage, UiState } from './protocol.types';

import { feedSchema, stateSchema } from './protocol.schemas';

export const parseState = (raw: string): UiState | null => {
  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = stateSchema.safeParse(data);

  return parsed.success ? parsed.data : null;
};

export const parseFeed = (raw: string): UiFeed | null => {
  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  const parsed = feedSchema.safeParse(data);

  return parsed.success ? parsed.data : null;
};

export const send = (message: UiMessage): boolean => gameface.send(JSON.stringify(message));

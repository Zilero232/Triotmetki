import type { z } from 'zod';

import type {
  battleResultSchema,
  sessionBattleSchema,
  sessionListItemSchema,
  sessionSchema,
  sessionsPageSchema,
  sessionTankDeltaSchema
} from './sessions.schemas';

export type BattleResult = z.infer<typeof battleResultSchema>;
export type SessionBattle = z.infer<typeof sessionBattleSchema>;
export type SessionTankDelta = z.infer<typeof sessionTankDeltaSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SessionListItem = z.infer<typeof sessionListItemSchema>;
export type SessionsPage = z.infer<typeof sessionsPageSchema>;

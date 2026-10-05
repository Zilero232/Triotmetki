import type { z } from 'zod';

import type { ArenaBlock, PersonalResult, ResultsBlock } from '../header/header.types';
import type { clientVersionSchema, playerResultSchema, replayGameSchema, replayPlayerSchema, replaySummarySchema } from './summary.schemas';

export type ReplayGame = z.infer<typeof replayGameSchema>;
export type ClientVersion = z.infer<typeof clientVersionSchema>;
export type PlayerResult = z.infer<typeof playerResultSchema>;
export type ReplayPlayer = z.infer<typeof replayPlayerSchema>;
export type ReplaySummary = z.infer<typeof replaySummarySchema>;

export type BuildSummaryInput = {
  arena: ArenaBlock;
  results: ResultsBlock | null;
};

export type WithPersonalInput = {
  personal: PersonalResult | null;
  result: PlayerResult | null;
};

export type OutcomeOfInput = {
  team: number | null;
  winnerTeam: number | null;
};

import type { Competition } from '@otmetki/schemas';

import type { CompetitionEntry, CompetitionTeam } from '../../../../generated';

export type CompetitionStanding = Competition['standings'][number];

export type ToCompetitionStandingInput = {
  team: CompetitionTeam & { entries: CompetitionEntry[] };
  rank: number;
  nicknameOf: ReadonlyMap<bigint, string>;
};

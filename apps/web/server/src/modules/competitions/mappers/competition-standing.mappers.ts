import type { CompetitionStanding, ToCompetitionStandingInput } from './competition-standing.types';

export const toCompetitionStanding = ({ team, rank, nicknameOf }: ToCompetitionStandingInput): CompetitionStanding => ({
  id: team.id,
  name: team.name,
  rank,
  score: team.score,
  battles: team.battles,
  members: team.entries.map((entry) => ({
    accountId: Number(entry.accountId),
    nickname: nicknameOf.get(entry.accountId) ?? null,
    battles: entry.battles,
    score: entry.score,
    source: entry.source
  }))
});

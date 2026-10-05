import type { CompetitionScoring, CompetitionStatus } from '@otmetki/schemas';

import { COMPETITION, competitionScoringSchema } from '@otmetki/schemas';
import { sortBy, sumBy } from 'remeda';

import type {
  CompetitionStatusInput,
  ParticipantScore,
  RankableTeam,
  ScoreBattlesInput,
  ScoreLineInput,
  ScoreTotalsInput,
  TeamEntry
} from './competition-scoring.types';

import { roundTo } from '../../../../common/lib';
import { COMPETITION_SCORE } from './competition-scoring.constants';

const round = (value: number): number => roundTo({ value, digits: COMPETITION_SCORE.digits });

export const scoreLine = ({ line, scoring }: ScoreLineInput): number =>
  line.damage * scoring.damage +
  line.assist * scoring.assist +
  line.blocked * scoring.blocked +
  line.frags * scoring.frags +
  line.spotted * scoring.spotted +
  line.xp * scoring.xp +
  line.wins * scoring.win +
  line.survived * scoring.survive;

export const scoreBattles = ({ battles, scoring, limit }: ScoreBattlesInput): ParticipantScore => {
  const counted = battles.slice(0, limit);

  return { score: round(sumBy(counted, (line) => scoreLine({ line, scoring }))), battles: counted.length };
};

export const scoreTotals = ({ totals, battles, scoring, limit }: ScoreTotalsInput): ParticipantScore => {
  if (battles <= 0) {
    return { score: 0, battles: 0 };
  }

  const counted = Math.min(battles, limit);

  return { score: round((scoreLine({ line: totals, scoring }) * counted) / battles), battles: counted };
};

export const rankTeams = (teams: readonly RankableTeam[]): Map<string, number> => {
  const sorted = sortBy([...teams], [(team) => team.score, 'desc'], [(team) => team.battles, 'asc']);
  const ranks = new Map<string, number>();

  sorted.forEach((team, index) => {
    const previous = sorted[index - 1];
    const rank = previous && previous.score === team.score ? (ranks.get(previous.id) ?? index + 1) : index + 1;

    ranks.set(team.id, rank);
  });

  return ranks;
};

export const competitionStatus = ({ startsAt, endsAt, now }: CompetitionStatusInput): CompetitionStatus => {
  if (now < startsAt) {
    return 'upcoming';
  }

  return now < endsAt ? 'running' : 'finished';
};

export const teamTotals = (entries: readonly TeamEntry[]): ParticipantScore => ({
  score: round(sumBy(entries, (entry) => entry.score)),
  battles: sumBy(entries, (entry) => entry.battles)
});

export const readScoring = (value: unknown): CompetitionScoring => {
  const parsed = competitionScoringSchema.safeParse(value);

  return parsed.success ? parsed.data : COMPETITION.defaultScoring;
};

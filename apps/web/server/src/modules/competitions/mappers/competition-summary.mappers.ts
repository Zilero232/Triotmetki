import type { CompetitionSummary } from '@otmetki/schemas';

import { competitionVisibilitySchema } from '@otmetki/schemas';

import type { ToCompetitionSummaryInput } from './competition-summary.types';

import { competitionStatus } from '../lib/competition-scoring/competition-scoring';

export const toCompetitionSummary = ({ row, now }: ToCompetitionSummaryInput): CompetitionSummary => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  visibility: competitionVisibilitySchema.parse(row.visibility),
  mode: row.mode,
  battlesPerPlayer: row.battlesPerPlayer,
  minTier: row.minTier,
  status: competitionStatus({ startsAt: row.startsAt, endsAt: row.endsAt, now }),
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
  teams: row._count.teams,
  participants: row._count.entries,
  organizer: row.owner.name || null,
  leader: row.teams[0] && row.teams[0].score > 0 ? row.teams[0].name : null
});

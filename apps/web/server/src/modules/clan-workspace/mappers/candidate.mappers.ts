import type { CandidateStats, CandidateView } from '../clan-workspace.types';
import type { CandidateRow } from './candidate.types';

import { candidateStatsSchema } from '../dto/clan-workspace.schemas';

const nullableStats = candidateStatsSchema.nullable().catch(null);

const readCandidateStats = (value: unknown): CandidateStats | null => nullableStats.parse(value ?? null);

export const toCandidateView = (candidate: CandidateRow): CandidateView => ({
  id: candidate.id,
  accountId: Number(candidate.accountId),
  status: candidate.status,
  notes: candidate.notes,
  stats: readCandidateStats(candidate.statsSnapshot),
  createdAt: candidate.createdAt.toISOString(),
  updatedAt: candidate.updatedAt.toISOString()
});

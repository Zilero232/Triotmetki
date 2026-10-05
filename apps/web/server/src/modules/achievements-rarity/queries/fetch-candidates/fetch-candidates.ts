import type { FetchCandidatesInput } from './fetch-candidates.types';

import { Prisma } from '../../../../../generated';
import { ACHIEVEMENTS_FETCH } from '../../config';

export const fetchCandidatesSql = ({ staleBefore, limit }: FetchCandidatesInput): Prisma.Sql => Prisma.sql`
  SELECT p.account_id AS "accountId"
  FROM player p
  LEFT JOIN account_achievements a ON a.account_id = p.account_id
  WHERE p.tracking_tier::text IN (${Prisma.join(ACHIEVEMENTS_FETCH.tiers)})
    AND NOT p.is_hidden
    AND (a.fetched_at IS NULL OR a.fetched_at < ${staleBefore})
    AND NOT EXISTS (
      SELECT 1
      FROM data_deletion_request d
      WHERE d.account_id = p.account_id
        AND d.source::text IN (${Prisma.join(ACHIEVEMENTS_FETCH.blockingSources)})
        AND d.status::text IN (${Prisma.join(ACHIEVEMENTS_FETCH.blockingStatuses)})
    )
  ORDER BY a.fetched_at ASC NULLS FIRST, p.last_battle_at DESC NULLS LAST, p.account_id ASC
  LIMIT ${limit}
`;

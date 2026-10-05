import type { ClaimActiveInput } from './claim-active.types';

import { Prisma } from '../../../../../../generated';

export const claimActiveSql = ({ now, nextPollAt, limit }: ClaimActiveInput): Prisma.Sql => Prisma.sql`
  UPDATE player
  SET next_poll_at = ${nextPollAt}, updated_at = now()
  WHERE account_id IN (
    SELECT account_id
    FROM player
    WHERE tracking_tier = 'active'::tracking_tier
      AND (next_poll_at IS NULL OR next_poll_at <= ${now})
    ORDER BY next_poll_at ASC NULLS FIRST
    LIMIT ${limit}
    FOR UPDATE SKIP LOCKED
  )
  RETURNING account_id AS "accountId"
`;

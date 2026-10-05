import type { AccountSnapshotWindowSqlInput } from './account-snapshot-window.types';

import { Prisma } from '../../../../../../generated';

export const accountSnapshotWindowSql = ({ accountId, mode, since, battles }: AccountSnapshotWindowSqlInput): Prisma.Sql => Prisma.sql`
  WITH history AS NOT MATERIALIZED (
    SELECT captured_at, battles FROM account_snapshot WHERE account_id = ${accountId} AND mode = ${mode}::stats_mode
  ),
  latest AS (
    SELECT battles FROM history ORDER BY captured_at DESC LIMIT 1
  )
  SELECT captured_at AS "capturedAt", battles
  FROM (
    (SELECT captured_at, battles FROM history WHERE captured_at > ${since})
    UNION
    (SELECT captured_at, battles FROM history WHERE captured_at <= ${since} ORDER BY captured_at DESC LIMIT 1)
    UNION
    (SELECT captured_at, battles FROM history WHERE battles <= (SELECT battles FROM latest) - ${battles} ORDER BY captured_at DESC LIMIT 1)
    UNION
    (SELECT captured_at, battles FROM history ORDER BY captured_at LIMIT 1)
  ) AS points
  ORDER BY captured_at
`;

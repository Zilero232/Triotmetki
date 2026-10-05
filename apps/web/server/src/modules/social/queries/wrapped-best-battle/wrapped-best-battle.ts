import type { WrappedBestBattleSqlInput } from './wrapped-best-battle.types';

import { Prisma } from '../../../../../generated';
import { ownerTrustedBattleSql } from '../../../mod';

export const wrappedBestBattleSql = ({ accountId, start, end }: WrappedBestBattleSqlInput): Prisma.Sql => Prisma.sql`
  SELECT b.id, b.tank_id AS "tankId", b.damage_dealt AS "damageDealt", b.frags, b.started_at AS "startedAt", b.arena_unique_id AS "arenaUniqueId"
  FROM battle b
  WHERE b.account_id = ${accountId}
    AND b.started_at >= ${start} AND b.started_at < ${end}
    AND ${ownerTrustedBattleSql}
  ORDER BY b.damage_dealt DESC
  LIMIT 1
`;

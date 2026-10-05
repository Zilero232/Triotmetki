import type { OpenLiveSessionSqlInput } from './live-session.types';

import { Prisma } from '../../../../../generated';

export const openLiveSessionSql = ({ id, accountId, startedAt }: OpenLiveSessionSqlInput): Prisma.Sql => Prisma.sql`
  INSERT INTO play_session (id, account_id, source, kind, status, started_at, last_activity_at, credits)
  VALUES (${id}, ${accountId}, 'mod'::session_source, 'live'::session_kind, 'open'::session_status, ${startedAt}, now(), 0)
  ON CONFLICT (id) DO NOTHING
`;

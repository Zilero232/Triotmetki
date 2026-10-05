import { differenceInMinutes } from 'date-fns';

import type { ClanEventView } from '../clan-workspace.types';
import type { ToEventViewInput } from './clan-event.types';

import { toIso } from '../../../common/lib';
import { EVENT_KIND_FROM_DB } from '../lib/clan-event/clan-event.constants';

export const toClanEventView = ({ event, nicknames }: ToEventViewInput): ClanEventView => ({
  id: event.id,
  kind: EVENT_KIND_FROM_DB[event.kind],
  title: event.title,
  startsAt: event.startsAt.toISOString(),
  endsAt: toIso(event.endsAt),
  remindAt: toIso(event.remindAt),
  remindMinutesBefore: event.remindAt ? differenceInMinutes(event.startsAt, event.remindAt) : null,
  remindedAt: toIso(event.remindedAt),
  attendance: event.attendance.map((row) => ({
    accountId: Number(row.accountId),
    nickname: nicknames.get(row.accountId) ?? null,
    status: row.status,
    source: row.source
  }))
});

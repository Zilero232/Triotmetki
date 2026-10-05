import { addHours } from 'date-fns';
import { mock } from 'vitest-mock-extended';

import type { Battle, ClanAttendance, ClanEvent, ClanMember } from '../../../../../generated';
import type { EventWithAttendance } from '../../mappers/clan-event.types';

import { ATTENDANCE_BONUS_TYPES } from '../../config/attendance.constants';
import { CLAN_WORKSPACE } from '../../config/workspace.constants';

export const clanId = 100;
export const scope = { clanId, userId: 'u1' };
export const startsAt = new Date('2026-09-20T18:00:00Z');
export const endsAt = addHours(startsAt, 2);
export const now = addHours(endsAt, CLAN_WORKSPACE.syncDelayHours);
export const [skirmish, advance] = ATTENDANCE_BONUS_TYPES.stronghold;
export const randomBattle = 1;

export const clanEvent = (fields: Partial<ClanEvent> = {}): ClanEvent => ({
  id: 'e1',
  clanId: BigInt(clanId),
  kind: 'stronghold',
  title: 'Stronghold',
  startsAt,
  endsAt,
  remindAt: null,
  remindedAt: null,
  data: null,
  createdAt: startsAt,
  ...fields
});

export const member = (accountId: bigint): ClanMember => ({
  accountId,
  clanId: BigInt(clanId),
  role: 'private',
  joinedAt: null,
  updatedAt: startsAt
});

export const attendance = (accountId: bigint, status: ClanAttendance['status']): ClanAttendance => ({
  eventId: 'e1',
  accountId,
  status,
  source: 'manual',
  updatedAt: startsAt
});

export const withAttendance: EventWithAttendance = { ...clanEvent(), attendance: [] };

export const played = ({ accountId, bonusType }: { accountId: bigint; bonusType: number }) =>
  mock<Battle>({ accountId, battleType: String(bonusType) });

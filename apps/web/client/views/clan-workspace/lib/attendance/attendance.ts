import { countBy, fromKeys, isIncludedIn, reverse, sortBy } from 'remeda';

import type { AttendanceEntry } from '../../api';
import type {
  AttendanceChangesInput,
  AttendanceCounts,
  AttendanceDraftInput,
  AttendanceDraftRow,
  AttendanceTone,
  CanSyncAttendanceInput,
  HasStartedInput,
  MemberAttendance,
  MemberAttendanceInput,
  SplitEvents,
  SplitEventsInput
} from './attendance.types';

import { ATTENDANCE_STATUSES, SYNCED_EVENT_KINDS, WORKSPACE_VIEW } from '../../config';

export const attendanceCounts = (attendance: readonly AttendanceEntry[]): AttendanceCounts => {
  const counts = countBy(attendance, (entry) => entry.status);

  return fromKeys(ATTENDANCE_STATUSES, (status) => counts[status] ?? 0);
};

export const memberAttendance = ({ events, accountIds }: MemberAttendanceInput): Map<number, MemberAttendance> => {
  const marks = events.flatMap((event) => event.attendance.filter((entry) => entry.status === 'attended' || entry.status === 'absent'));

  return new Map(
    accountIds.map((accountId) => {
      const own = marks.filter((entry) => entry.accountId === accountId);
      const attended = own.filter((entry) => entry.status === 'attended').length;

      return [accountId, { attended, total: own.length, rate: own.length > 0 ? attended / own.length : null }];
    })
  );
};

export const attendanceDraft = ({ event, members }: AttendanceDraftInput): AttendanceDraftRow[] => {
  const statuses = new Map(event.attendance.map((entry) => [entry.accountId, entry.status]));

  return sortBy(
    members.map((member) => ({ ...member, status: statuses.get(member.accountId) ?? 'invited' })),
    (row) => row.nickname.toLowerCase()
  );
};

export const attendanceChanges = ({ rows, draft }: AttendanceChangesInput) =>
  rows.flatMap((row) => {
    const status = draft[row.accountId];

    return status === undefined || status === row.status ? [] : [{ accountId: row.accountId, status }];
  });

export const splitEvents = ({ events, now }: SplitEventsInput): SplitEvents => {
  const moment = now?.getTime() ?? Number.NEGATIVE_INFINITY;
  const sorted = sortBy([...events], (event) => event.startsAt);

  return {
    upcoming: sorted.filter((event) => Date.parse(event.endsAt ?? event.startsAt) >= moment),
    past: reverse(sorted.filter((event) => Date.parse(event.endsAt ?? event.startsAt) < moment))
  };
};

export const hasStarted = ({ startsAt, now }: HasStartedInput): boolean => now !== null && Date.parse(startsAt) <= now.getTime();

export const canSyncAttendance = ({ kind, startsAt, now }: CanSyncAttendanceInput): boolean => {
  const isSyncedKind = isIncludedIn(kind, SYNCED_EVENT_KINDS);

  return isSyncedKind && hasStarted({ startsAt, now });
};

export const attendanceTone = (rate: number | null): AttendanceTone => {
  if (rate === null) {
    return 'steel';
  }

  if (rate >= WORKSPACE_VIEW.attendanceGood) {
    return 'good';
  }

  return rate <= WORKSPACE_VIEW.attendanceBad ? 'bad' : 'average';
};

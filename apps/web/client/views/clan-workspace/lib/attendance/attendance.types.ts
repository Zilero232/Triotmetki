import type { ClanMember } from '@otmetki/schemas';

import type { ProgressTone } from '@/ui-kit';

import type { AttendanceStatus, WorkspaceEvent } from '../../api';

export type AttendanceCounts = Record<AttendanceStatus, number>;

export type MemberAttendance = {
  attended: number;
  total: number;
  rate: number | null;
};

export type MemberAttendanceInput = {
  events: readonly Pick<WorkspaceEvent, 'attendance'>[];
  accountIds: readonly number[];
};

export type AttendanceDraftInput = {
  event: Pick<WorkspaceEvent, 'attendance'>;
  members: readonly Pick<ClanMember, 'accountId' | 'nickname' | 'role'>[];
};

export type AttendanceDraftRow = Pick<ClanMember, 'accountId' | 'nickname' | 'role'> & {
  status: AttendanceStatus;
};

export type SplitEventsInput = {
  events: readonly WorkspaceEvent[];
  now: Date | null;
};

export type SplitEvents = {
  upcoming: WorkspaceEvent[];
  past: WorkspaceEvent[];
};

export type AttendanceChangesInput = {
  rows: readonly AttendanceDraftRow[];
  draft: Readonly<Record<number, AttendanceStatus>>;
};

export type HasStartedInput = Pick<WorkspaceEvent, 'startsAt'> & {
  now: Date | null;
};

export type CanSyncAttendanceInput = Pick<WorkspaceEvent, 'kind' | 'startsAt'> & {
  now: Date | null;
};

export type AttendanceTone = Extract<ProgressTone, 'average' | 'bad' | 'good' | 'steel'>;

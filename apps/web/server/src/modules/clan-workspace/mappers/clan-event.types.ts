import type { ClanAttendance, ClanEvent } from '../../../../generated';

export type EventWithAttendance = ClanEvent & {
  attendance: ClanAttendance[];
};

export type ToEventViewInput = {
  event: EventWithAttendance;
  nicknames: ReadonlyMap<bigint, string>;
};

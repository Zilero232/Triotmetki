import type { BadgeTone } from '@/ui-kit';

import type { AttendanceStatus, WorkspaceEventKind } from '../api';

export const EVENT_KINDS = ['clan_wars', 'stronghold', 'training', 'tournament', 'other'] as const satisfies readonly WorkspaceEventKind[];

export const SYNCED_EVENT_KINDS = ['clan_wars', 'stronghold'] as const satisfies readonly WorkspaceEventKind[];

export const ATTENDANCE_STATUSES = ['invited', 'confirmed', 'declined', 'attended', 'absent'] as const satisfies readonly AttendanceStatus[];

export const ATTENDANCE_TONES = {
  invited: 'neutral',
  confirmed: 'steel',
  declined: 'warning',
  attended: 'success',
  absent: 'danger'
} as const satisfies Record<AttendanceStatus, BadgeTone>;

export const EVENT_KIND_TONES = {
  clan_wars: 'accent',
  stronghold: 'brass',
  training: 'sky',
  tournament: 'battle',
  other: 'neutral'
} as const satisfies Record<WorkspaceEventKind, BadgeTone>;

export const REMIND_OPTIONS = ['0', '15', '30', '60', '180', '1440'] as const;

export const EVENT_FORM_DEFAULTS = {
  title: '',
  kind: 'clan_wars',
  startsAt: '',
  endsAt: '',
  remind: '30'
} as const;

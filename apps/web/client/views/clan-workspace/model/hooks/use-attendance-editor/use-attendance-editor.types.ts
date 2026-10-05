import type { ClanMember } from '@otmetki/schemas';

import type { AttendanceStatus } from '../../../api';
import type { UseEventActionsInput } from '../use-event-actions';

export type UseAttendanceEditorInput = UseEventActionsInput & {
  members: readonly ClanMember[];
};

export type AttendanceStatusChangeInput = {
  accountId: number;
  status: AttendanceStatus;
};

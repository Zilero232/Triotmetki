'use client';

import { useBoolean } from '@siberiacancode/reactuse';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { communityErrorKind } from '@/features/community/api-error';
import { QUERY_KEYS } from '@/shared/constants';

import type { AttendanceStatus } from '../../../api';
import type { AttendanceStatusChangeInput, UseAttendanceEditorInput } from './use-attendance-editor.types';

import { setEventAttendance } from '../../../api';
import { ATTENDANCE_STATUSES } from '../../../config';
import { attendanceChanges, attendanceDraft } from '../../../lib/attendance';

export const useAttendanceEditor = ({ clanId, event, members }: UseAttendanceEditorInput) => {
  const t = useTranslations('clanWorkspace');
  const queryClient = useQueryClient();
  const [isOpen, setOpen] = useBoolean(false);
  const [draft, setDraft] = useState<Record<number, AttendanceStatus>>({});
  const save = useMutation({
    mutationFn: setEventAttendance,
    onSuccess: async () => {
      toast.success(t('attendance.saved'));
      setOpen(false);
      setDraft({});
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clanWorkspace.all(clanId) });
    },
    onError: (error) => toast.error(t(`errors.${communityErrorKind(error)}`))
  });

  const rows = attendanceDraft({ event, members });
  const changes = attendanceChanges({ rows, draft });

  return {
    isOpen,
    rows: rows.map((row) => ({ ...row, status: draft[row.accountId] ?? row.status })),
    statuses: ATTENDANCE_STATUSES,
    changed: changes.length,
    isSaving: save.isPending,
    onOpenChange: (next: boolean) => {
      setOpen(next);
      setDraft({});
    },
    onStatusChange: ({ accountId, status }: AttendanceStatusChangeInput) => setDraft((current) => ({ ...current, [accountId]: status })),
    onSave: () => save.mutate({ clanId, id: event.id, entries: changes })
  };
};

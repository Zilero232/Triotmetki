'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { match, P } from 'ts-pattern';

import { useCommunityViewer } from '@/entities/auth/session';
import { communityErrorKind } from '@/features/community/api-error';
import { QUERY_KEYS } from '@/shared/constants';
import { useClientNow } from '@/shared/lib';

import type { RsvpStatus } from '../../../api';
import type { UseEventActionsInput } from './use-event-actions.types';

import { removeWorkspaceEvent, rsvpEvent, syncEventAttendance } from '../../../api';
import { ATTENDANCE_STATUSES } from '../../../config';
import { attendanceCounts, canSyncAttendance, hasStarted } from '../../../lib/attendance';

export const useEventActions = ({ clanId, event }: UseEventActionsInput) => {
  const t = useTranslations('clanWorkspace');
  const format = useFormatter();
  const queryClient = useQueryClient();
  const viewer = useCommunityViewer();
  const now = useClientNow();
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clanWorkspace.all(clanId) });
  const onError = (error: Error) => toast.error(t(`errors.${communityErrorKind(error)}`));
  const rsvp = useMutation({
    mutationFn: (status: RsvpStatus) => rsvpEvent({ clanId, id: event.id, status }),
    onSuccess: async () => {
      toast.success(t('events.rsvpSaved'));
      await refresh();
    },
    onError
  });

  const remove = useMutation({
    mutationFn: () => removeWorkspaceEvent({ clanId, id: event.id }),
    onSuccess: async () => {
      toast.success(t('events.removed'));
      await refresh();
    },
    onError
  });

  const sync = useMutation({
    mutationFn: () => syncEventAttendance({ clanId, id: event.id }),
    onSuccess: async () => {
      toast.success(t('events.synced'));
      await refresh();
    },
    onError
  });

  const mine = event.attendance.find((entry) => viewer.ownsAccount(entry.accountId))?.status ?? null;
  const counts = attendanceCounts(event.attendance);
  const at = (time: string) => format.dateTime(new Date(time), 'dateTime');

  return {
    attendance: ATTENDANCE_STATUSES.filter((status) => counts[status] > 0).map((status) => ({ status, count: counts[status] })),
    reminder: match(event)
      .with({ remindedAt: P.string }, ({ remindedAt }) => t('events.reminderSent', { time: at(remindedAt) }))
      .with({ remindAt: P.string }, ({ remindAt }) => t('events.reminderAt', { time: at(remindAt) }))
      .otherwise(() => t('events.noReminder')),
    myStatus: mine,
    hasStarted: hasStarted({ startsAt: event.startsAt, now }),
    canSync: canSyncAttendance({ kind: event.kind, startsAt: event.startsAt, now }),
    isRsvpPending: rsvp.isPending,
    isRemoving: remove.isPending,
    isSyncing: sync.isPending,
    onRsvp: (status: RsvpStatus) => rsvp.mutate(status),
    onRemove: () => remove.mutate(),
    onSync: () => sync.mutate()
  };
};

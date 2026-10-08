'use client';

import { useMutation } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/constants';

import { getModDevices, issueBindCode, revokeModDevice } from '../../../api';
import { MOD_BIND } from '../../../config';
import { useMeSection } from '../use-me-section';

export const useModBindCard = () => {
  const devicesQuery = useMeSection({ section: 'devices', fetcher: getModDevices });
  const issue = useMutation({
    mutationFn: () => issueBindCode(),
    meta: { errorKey: 'me.toast.failed', invalidates: [QUERY_KEYS.me.section('devices')] }
  });

  const revoke = useMutation({
    mutationFn: revokeModDevice,
    meta: { successKey: 'me.toast.deviceRevoked', errorKey: 'me.toast.failed', invalidates: [QUERY_KEYS.me.section('devices')] }
  });

  return {
    code: issue.data,
    steps: MOD_BIND.steps,
    devicesQuery,
    isIssuing: issue.isPending,
    isRetrying: devicesQuery.isFetching,
    revokingId: revoke.isPending ? revoke.variables : null,
    onIssue: () => issue.mutate(undefined),
    onRetry: () => void devicesQuery.refetch(),
    onRevoke: (id: string) => revoke.mutate(id)
  };
};

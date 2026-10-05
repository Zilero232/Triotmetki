'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { useCommunityViewer } from '@/entities/auth/session';
import { coachQueries } from '@/entities/coaching/coach';
import { communityErrorKind } from '@/features/community/api-error';
import { useFormDialog } from '@/features/community/form-dialog';
import { isNotFoundError } from '@/shared/api/source';
import { QUERY_KEYS } from '@/shared/constants';

import { saveCoachProfile } from '../../../api';
import { coachFormSchema, toCoachFormValues, toUpsertCoach } from '../../../lib/coach-form';

export const useCoachProfileForm = () => {
  const t = useTranslations('coaching');
  const { userId, isSignedIn, accounts } = useCommunityViewer();
  const { data: own, isPending, isError, error } = useQuery({ ...coachQueries.detail(userId ?? ''), enabled: userId !== null });
  const dialog = useFormDialog({
    schema: coachFormSchema,
    defaults: toCoachFormValues({ coach: own ?? null, fallbackAccountId: accounts[0]?.accountId ?? null }),
    mutationFn: (values) => saveCoachProfile(toUpsertCoach(values)),
    successMessage: t('profile.saved'),
    errorMessage: (error) => t(`errors.${communityErrorKind(error)}`),
    invalidate: QUERY_KEYS.coaching.all
  });

  return {
    dialog,
    accounts,
    isSignedIn,
    hasProfile: Boolean(own),
    isLoading: userId !== null && (isPending || (isError && !isNotFoundError(error)))
  };
};

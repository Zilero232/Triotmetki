'use client';

import type { CheckoutInput } from '@otmetki/schemas';

import { PLUS } from '@otmetki/schemas';
import { useFormatter, useTranslations } from 'next-intl';
import { useFormState } from 'react-hook-form';

import { useLoginHref } from '@/entities/auth/session';
import { useStartTrial } from '@/entities/plus/subscription';
import { usePlus } from '@/features/plus/plus-gate';

import { checkoutMode, checkoutNote } from '../../../lib/checkout-state';

export const useCheckoutAction = () => {
  const t = useTranslations('plus');
  const format = useFormatter();
  const loginHref = useLoginHref();
  const access = usePlus();
  const trial = useStartTrial();
  const { isSubmitting, isSubmitSuccessful } = useFormState<CheckoutInput>();

  const isCheckoutOpen = access.isSignedIn ? access.isCheckoutAvailable : PLUS.checkoutEnabled;
  const mode = checkoutMode(access);
  const note = checkoutNote(access);
  const periodEnd = access.periodEnd ? format.dateTime(new Date(access.periodEnd), { dateStyle: 'long' }) : null;

  return {
    mode,
    isStatusVisible: mode !== 'error',
    retryAccess: access.refetch,
    isAccessRetrying: access.isRefetching,
    loginHref,
    trialDays: access.trialDays,
    canStartTrial: access.trialAvailable,
    isTrialPending: trial.isPending,
    startTrial: () => trial.mutate(),
    isRedirecting: isSubmitting || isSubmitSuccessful,
    isClosed: !access.isPlus && !isCheckoutOpen,
    canNotify: mode === 'trial' || mode === 'promo',
    note: note.kind === 'state' ? t(`state.${note.state}`, { date: periodEnd ?? '—' }) : t(`checkout.action.${note.key}`, { days: access.trialDays })
  };
};

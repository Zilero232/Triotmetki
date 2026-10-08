'use client';

import { useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Button, buttonVariants, ErrorState, Skeleton } from '@/ui-kit';

import { useCheckoutAction } from '../../../../../model/hooks';
import { CheckoutStatus } from '../CheckoutStatus';

import s from './CheckoutAction.module.scss';

export const CheckoutAction = () => {
  const t = useTranslations('plus.checkout.action');
  const {
    mode,
    isStatusVisible,
    retryAccess,
    isAccessRetrying,
    loginHref,
    trialDays,
    canStartTrial,
    isTrialPending,
    startTrial,
    isRedirecting,
    isClosed,
    canNotify,
    note
  } = useCheckoutAction();

  const primary = buttonVariants({ variant: 'premium', size: 'lg', block: true });
  const secondary = buttonVariants({ variant: 'secondary', size: 'lg', block: true });
  const trialLabel = isTrialPending ? t('trialPending') : t('trial', { days: trialDays });

  return (
    <div className={s.root}>
      <div className={s.actions}>
        {match(mode)
          .with('pending', () => <Skeleton className={s.skeleton} shape='block' />)
          .with('error', () => <ErrorState isCompact isRetrying={isAccessRetrying} onRetry={retryAccess} />)
          .with('guest', () => (
            <Link className={primary} href={loginHref}>
              {t('signIn')}
            </Link>
          ))
          .with('plus', () => (
            <Link className={secondary} href={ROUTES.account.billing}>
              {t('manage')}
            </Link>
          ))
          .with('buy', () => (
            <>
              <Button block disabled={isRedirecting} size='lg' type='submit' variant='premium'>
                {isRedirecting ? t('redirecting') : t('buy')}
              </Button>
              {canStartTrial && (
                <Button block disabled={isTrialPending} size='lg' type='button' variant='secondary' onClick={startTrial}>
                  {trialLabel}
                </Button>
              )}
            </>
          ))
          .with('trial', () => (
            <>
              <Button block disabled={isTrialPending} size='lg' type='button' variant='premium' onClick={startTrial}>
                {trialLabel}
              </Button>
              <Link className={secondary} href={ROUTES.account.billing}>
                {t('promo')}
              </Link>
            </>
          ))
          .with('promo', () => (
            <Link className={primary} href={ROUTES.account.billing}>
              {t('promo')}
            </Link>
          ))
          .exhaustive()}
      </div>
      {isStatusVisible && <CheckoutStatus canNotify={canNotify} isClosed={isClosed} isPending={mode === 'pending'} note={note} />}
    </div>
  );
};

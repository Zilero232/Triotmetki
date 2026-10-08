'use client';

import { useTranslations } from 'next-intl';

import { SectionHeader } from '@/ui-kit';

import { useCheckoutReturn } from '../model/hooks';
import { PaymentHistory, PromoRedeemCard, ReferralCard, StatusPanel } from './components';

import s from './BillingPage.module.scss';

export const BillingPage = () => {
  const t = useTranslations('billing.header');
  const tBrand = useTranslations('brand');

  useCheckoutReturn();

  return (
    <div className={s.root}>
      <SectionHeader as='h1' description={t('description', { plus: tBrand('plus') })} title={t('title')} />
      <StatusPanel />
      <div className={s.grid}>
        <PromoRedeemCard />
        <ReferralCard />
      </div>
      <PaymentHistory />
    </div>
  );
};

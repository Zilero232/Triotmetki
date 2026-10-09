'use client';

import { OtmetkiLogoIcon } from '@otmetki/icons';
import { useFormatter, useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Band, buttonVariants, KeyFigure, PageHero } from '@/ui-kit';

import { PLUS_CHECKOUT } from '../config';
import { usePlusPage } from '../model/hooks';
import { PlusBenefits, PlusCheckout, PlusFaq, PlusLimits } from './components';

import s from './PlusPage.module.scss';

export const PlusPage = () => {
  const t = useTranslations('plus.header');
  const tBrand = useTranslations('brand');
  const format = useFormatter();
  const { isPlus, isTrialOffered, trialDays, fromMonthlyRub } = usePlusPage();

  const priceValue = fromMonthlyRub === null ? null : t('priceValue', { price: format.number(fromMonthlyRub, PLUS_CHECKOUT.priceFormat) });

  return (
    <div className={s.root}>
      <PageHero
        actions={
          <div className={s.actions}>
            {isPlus ? (
              <Link className={buttonVariants({ variant: 'premium', size: 'lg' })} href={ROUTES.account.billing}>
                {t('manage')}
              </Link>
            ) : (
              <a className={buttonVariants({ variant: 'premium', size: 'lg' })} href={`#${PLUS_CHECKOUT.anchor}`}>
                {isTrialOffered ? t('ctaTrial', { days: trialDays }) : t('cta')}
              </a>
            )}
            {isTrialOffered && <p className={s.offer}>{t('trialOffer', { days: trialDays })}</p>}
          </div>
        }
        art={{ kind: 'emblem', glyph: <OtmetkiLogoIcon size={480} /> }}
        breadcrumbs={[{ label: tBrand('plus') }]}
        figures={<KeyFigure label={t('priceFigure')} size='xl' value={priceValue} variant='compact' />}
        lead={t('description')}
        title={tBrand('plus')}
      />
      <div className={s.section}>
        <PlusBenefits />
      </div>
      <div className={s.section}>
        <PlusLimits />
      </div>
      <Band tone='raised'>
        <PlusCheckout />
      </Band>
      <div className={s.section}>
        <PlusFaq trialDays={trialDays} />
      </div>
    </div>
  );
};

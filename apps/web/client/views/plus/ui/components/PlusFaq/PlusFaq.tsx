import { PLUS_GRACE, PLUS_TRIAL } from '@otmetki/schemas';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { FaqList, SectionHeader } from '@/ui-kit';

import type { PlusFaqProps } from './PlusFaq.types';

import { PLUS_FAQ } from '../../../config';

import s from './PlusFaq.module.scss';

export const PlusFaq = ({ trialDays }: PlusFaqProps) => {
  const t = useTranslations('plus.faq');

  return (
    <section className={s.root}>
      <SectionHeader title={t('title')} />
      <FaqList
        items={PLUS_FAQ.items.map((id) => ({
          id,
          question: t(`items.${id}.question`),
          answer: (
            <>
              {id === 'trial' && t('items.trial.answer', { days: trialDays, referralDays: PLUS_TRIAL.referralDays })}
              {id === 'cancel' &&
                t.rich('items.cancel.answer', {
                  terms: (chunks) => (
                    <Link className={s.link} href={ROUTES.legal.refund}>
                      {chunks}
                    </Link>
                  )
                })}
              {id !== 'trial' && id !== 'cancel' && t(`items.${id}.answer`, { days: PLUS_GRACE.overflowReadOnlyDays })}
            </>
          )
        }))}
      />
    </section>
  );
};

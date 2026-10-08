import { PLUS_LIMITS, USAGE_METERS } from '@otmetki/schemas';
import { useFormatter, useTranslations } from 'next-intl';
import { entries } from 'remeda';
import { match } from 'ts-pattern';

import { SectionHeader } from '@/ui-kit';

import { PLUS_LIMIT_ROWS, PLUS_LIMIT_TIERS, PLUS_LIMIT_UNITS } from '../../../config';

import s from './PlusLimits.module.scss';

export const PlusLimits = () => {
  const t = useTranslations('plus.limits');
  const format = useFormatter();

  return (
    <section className={s.root}>
      <SectionHeader description={t('description')} title={t('title')} />
      <table className={s.table}>
        <caption className={s.caption}>{t('caption')}</caption>
        <thead>
          <tr>
            <th scope='col'>{t('feature')}</th>
            <th scope='col'>{t('free')}</th>
            <th className={s.plus} scope='col'>
              {t('plus')}
            </th>
          </tr>
        </thead>
        <tbody>
          {PLUS_LIMIT_ROWS.map((key) => (
            <tr key={key}>
              <th scope='row'>{t(`rows.${key}`)}</th>
              {PLUS_LIMIT_TIERS.map((tier) => (
                <td key={tier} className={tier === 'plus' ? s.plus : undefined}>
                  {match(PLUS_LIMITS[key][tier])
                    .with(null, () => t('unlimited'))
                    .otherwise((count) => (PLUS_LIMIT_UNITS[key] ? t(`units.${PLUS_LIMIT_UNITS[key]}`, { count }) : format.number(count)))}
                </td>
              ))}
            </tr>
          ))}
          {entries(USAGE_METERS).map(([key, meter]) => (
            <tr key={key}>
              <th scope='row'>{t(`rows.${key}`)}</th>
              {PLUS_LIMIT_TIERS.map((tier) => (
                <td key={tier} className={tier === 'plus' ? s.plus : undefined}>
                  {meter[tier] === null ? t('unlimited') : t('rate.month', { count: meter[tier] })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={s.note}>{t('meters', { armor: USAGE_METERS.armor3d.anonymous })}</p>
    </section>
  );
};

'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { useSettingsFormatter } from '@/entities/streamer/settings';
import { Card } from '@/ui-kit';

import type { AggregateFieldCardProps } from './AggregateFieldCard.types';

import s from './AggregateFieldCard.module.scss';

export const AggregateFieldCard = ({ field }: AggregateFieldCardProps) => {
  const t = useTranslations('streamerSettings.aggregates');
  const format = useFormatter();
  const { fieldLabel, optionLabel, numberText } = useSettingsFormatter();

  return (
    <Card className={s.root} padding='sm' variant='well'>
      <div className={s.head}>
        <h3 className={s.title}>{fieldLabel(field.field)}</h3>
        <span className={s.count}>{t('contributors', { count: field.contributors })}</span>
      </div>
      {field.median !== null && (
        <div>
          <span className={s.medianLabel}>{t('median')} </span>
          <span className={s.median}>{numberText({ value: field.median, digits: null })}</span>
        </div>
      )}
      <ul className={s.bars}>
        {field.shares.map((share) => (
          <li key={share.bucket} className={s.bar}>
            <span className={s.bucket} title={share.bucket}>
              {optionLabel(share.bucket)}
            </span>
            <span className={s.track}>
              <span className={s.fill} data-top={share.isTop} style={{ '--share': `${share.share * 100}%` }} />
            </span>
            <span className={s.share}>{format.number(share.share, 'share')}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
};

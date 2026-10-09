import { ExternalLink } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { TankLink } from '@/entities/tank/tank';
import { Badge } from '@/ui-kit';

import type { OfferCardProps } from './OfferCard.types';

import s from './OfferCard.module.scss';

export const OfferCard = ({ entry: { offer, href, vehicles, isRunning } }: OfferCardProps) => {
  const t = useTranslations('shop.offers');
  const format = useFormatter();

  return (
    <li className={s.root} data-running={isRunning}>
      <div className={s.head}>
        {href ? (
          <a className={s.title} href={href} rel='noopener noreferrer' target='_blank'>
            {offer.title}
            <ExternalLink aria-hidden className={s.icon} size={14} />
          </a>
        ) : (
          <span className={s.title}>{offer.title}</span>
        )}
        {offer.discountPercent !== null && <Badge tone='success'>−{format.number(offer.discountPercent / 100, 'percent')}</Badge>}
      </div>
      {vehicles.length > 0 && (
        <ul aria-label={t('tanks')} className={s.tanks}>
          {vehicles.map((vehicle) => (
            <li key={vehicle.tankId}>
              <TankLink image='small' vehicle={vehicle} />
            </li>
          ))}
        </ul>
      )}
      {(offer.priceRub !== null || offer.priceGold !== null) && (
        <div className={s.price}>
          {offer.priceRub !== null && (
            <span className={s.amount}>{format.number(offer.priceRub, { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
          )}
          {offer.priceGold !== null && <span className={s.amount}>{t('gold', { amount: offer.priceGold })}</span>}
        </div>
      )}
      <dl className={s.meta}>
        <div className={s.row}>
          <dt>{t('period')}</dt>
          <dd>
            {offer.startsAt ? format.dateTime(new Date(offer.startsAt), { dateStyle: 'medium' }) : '—'}
            {' — '}
            {offer.endsAt ? format.dateTime(new Date(offer.endsAt), { dateStyle: 'medium' }) : t('noEnd')}
          </dd>
        </div>
        <div className={s.row}>
          <dt>{t('status')}</dt>
          <dd>
            <Badge tone={isRunning ? 'accent' : 'neutral'}>{isRunning ? t('running') : t('ended')}</Badge>
          </dd>
        </div>
        <div className={s.row}>
          <dt>{t('timesSeen')}</dt>
          <dd>{t('timesSeenValue', { count: offer.timesSeen })}</dd>
        </div>
      </dl>
    </li>
  );
};

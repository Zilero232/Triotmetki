'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { PROMO_CAROUSEL } from '../../config';
import { usePromoBoard } from '../../model/hooks';
import { PromoCarousel } from '../components';

import s from './PromoBoard.module.scss';

export const PromoBoard = () => {
  const t = useTranslations('promo.board');
  const titleId = useId();
  const { hero, tiles } = usePromoBoard();

  return (
    <section aria-labelledby={titleId} className={s.root}>
      <h2 className={s.srTitle} id={titleId}>
        {t('title')}
      </h2>
      <div className={s.grid}>
        <PromoCarousel className={s.hero} delay={PROMO_CAROUSEL.heroDelay} items={hero} label={t('hero')} variant='hero' />
        {tiles.map(({ key, items, delay }, index) => (
          <PromoCarousel key={key} className={s.tile} delay={delay} items={items} label={t('tile', { index: index + 1 })} variant='tile' />
        ))}
      </div>
    </section>
  );
};

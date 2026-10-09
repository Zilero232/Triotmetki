'use client';

import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { Card } from '@/ui-kit';

import { GUESS_MAP } from '../../../config';
import { useMapFragment } from '../../../model/hooks';
import { FRAGMENT_ZOOM } from './MapFragment.motion';

import s from './MapFragment.module.scss';

export const MapFragment = () => {
  const t = useTranslations('play.map.fragment');
  const { image, name, zoom, status, isOver, origin } = useMapFragment();

  return (
    <Card className={s.root} data-status={status} variant='panel'>
      <div className={s.frame}>
        {image && (
          <m.div animate={{ scale: zoom }} className={s.zoom} initial={false} style={{ transformOrigin: origin }} transition={FRAGMENT_ZOOM}>
            <Image
              fill
              alt={isOver ? name : t('alt')}
              className={s.image}
              draggable={false}
              loading='eager'
              sizes={GUESS_MAP.imageSizes}
              src={image}
            />
          </m.div>
        )}
      </div>
      <div className={s.caption}>
        <span className={s.title}>{isOver ? name : t('classified')}</span>
        <span className={s.hint} role='status'>
          {isOver ? t(`status.${status}`) : t('zoom', { zoom })}
        </span>
      </div>
    </Card>
  );
};

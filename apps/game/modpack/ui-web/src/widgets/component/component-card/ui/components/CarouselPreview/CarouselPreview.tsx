import clsx from 'clsx';
import { range } from 'remeda';

import { useT } from '@/entities/window/window-state';

import type { CarouselPreviewProps } from './CarouselPreview.types';

import { CAROUSEL_PREVIEW } from '../../../config';

import s from './CarouselPreview.module.scss';

export const CarouselPreview = ({ model }: CarouselPreviewProps) => {
  const t = useT();
  const rows = model.rows ?? CAROUSEL_PREVIEW.nativeRows;
  const isCompact = rows > 1 && (model.small || rows > 2);

  return (
    <div aria-label={t('preview')} className={s.stage} role='img'>
      <span className={s.caption}>{t('preview')}</span>
      <span className={clsx(s.chip, model.rows === null && s.chipNative)}>
        {model.rows === null ? t('carouselPreviewNative') : `${t('carouselPreviewRows')}: ${model.rows}`}
      </span>
      <span className={s.tank} />
      <span className={s.floor} />
      <div className={clsx(s.carousel, model.rows === null && s.carouselNative)}>
        {range(0, rows).map((row) => (
          <div key={row} className={s.row}>
            {range(0, CAROUSEL_PREVIEW.columns).map((column) => (
              <span key={column} className={clsx(s.tile, isCompact && s.tileSmall, row === 0 && column === 0 && s.tileOn)}>
                <span className={s.tileShape} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

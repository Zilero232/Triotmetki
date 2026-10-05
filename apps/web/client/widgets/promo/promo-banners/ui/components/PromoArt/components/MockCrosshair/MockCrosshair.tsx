import { useFormatter, useTranslations } from 'next-intl';

import { PROMO_MOCK } from '../../../../../config';

import s from './MockCrosshair.module.scss';

export const MockCrosshair = () => {
  const t = useTranslations('promo.mock.crosshair');
  const format = useFormatter();
  const { reload, zoom } = PROMO_MOCK.crosshair;

  return (
    <div className={s.root}>
      <svg className={s.reticle} viewBox='0 0 200 200'>
        <circle className={s.halo} cx='100' cy='100' r='84' />
        <circle className={s.ring} cx='100' cy='100' r='62' />
        <path className={s.arc} d='M 64 49.5 A 62 62 0 0 1 150.5 64' />
        <path className={s.arc} d='M 136 150.5 A 62 62 0 0 1 49.5 136' />
        <path className={s.tick} d='M100 14v18M100 168v18M14 100h18M168 100h18' />
        <path className={s.gap} d='M100 80v10M100 110v10M80 100h10M110 100h10' />
        <circle className={s.dot} cx='100' cy='100' r='2.5' />
      </svg>
      <ul className={s.boxes}>
        <li className={s.box} data-kind='reload'>
          <span className={s.value}>{t('seconds', { value: format.number(reload.seconds, { minimumFractionDigits: 1 }) })}</span>
          <span className={s.label}>{t('reload')}</span>
          <ul className={s.clip}>
            {reload.clip.map(({ id, isLoaded }) => (
              <li key={id} className={s.round} data-loaded={isLoaded || undefined} />
            ))}
          </ul>
        </li>
        <li className={s.box}>
          <span className={s.value}>{t('zoomValue', { value: zoom })}</span>
          <span className={s.label}>{t('zoom')}</span>
        </li>
      </ul>
    </div>
  );
};

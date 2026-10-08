'use client';

import { useTranslations } from 'next-intl';
import { match, P } from 'ts-pattern';

import type { OverlayPageProps } from './OverlayPage.types';

import { useOverlayPage } from '../model/hooks';
import { OverlayStage } from './components';

import s from './OverlayPage.module.scss';

export const OverlayPage = ({ publicId }: OverlayPageProps) => {
  const t = useTranslations('overlay');
  const tFooter = useTranslations('footer');
  const { patch, data, isError, isValid } = useOverlayPage({ publicId });

  return (
    <div className={s.root}>
      {match({ isValid, data, isError })
        .with({ isValid: false }, () => <p className={s.notice}>{t('error.invalid')}</p>)
        .with({ data: { isPaused: true } }, () => <p className={s.notice}>{t('paused')}</p>)
        .with({ data: P.nonNullable }, ({ data: loaded }) => <OverlayStage data={loaded} patch={patch} />)
        .with({ isError: true }, () => <p className={s.notice}>{t('error.unavailable')}</p>)
        .otherwise(() => null)}
      <span className={s.attribution}>{tFooter('shortAttribution')}</span>
    </div>
  );
};

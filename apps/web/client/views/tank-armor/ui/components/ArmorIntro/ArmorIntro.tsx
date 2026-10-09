'use client';

import { useTranslations } from 'next-intl';

import s from './ArmorIntro.module.scss';

export const ArmorIntro = () => {
  const t = useTranslations('armor.page');

  return <p className={s.root}>{t('intro')}</p>;
};

'use client';

import { useTranslations } from 'next-intl';

import { KeyFigure, Skeleton } from '@/ui-kit';

import type { MarksHeadFiguresProps } from './MarksHeadFigures.types';

import { MARKS_HEAD } from '../../../config';

import s from './MarksHeadFigures.module.scss';

export const MarksHeadFigures = ({ stats }: MarksHeadFiguresProps) => {
  const t = useTranslations('marks.head');

  return (
    <>
      <KeyFigure className={s.figure} label={t('tracked')} size='xl' value={stats ? stats.total : null} />
      <KeyFigure
        className={s.figure}
        label={t('updated')}
        value={stats ? stats.updated : <Skeleton height={MARKS_HEAD.updatedSkeleton.height} width={MARKS_HEAD.updatedSkeleton.width} />}
      />
      <KeyFigure className={s.figure} label={t('window')} value={t('windowValue')} />
    </>
  );
};

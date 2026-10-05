'use client';

import { useTranslations } from 'next-intl';

import { ModeSeason, ModeSourceNote } from '@/entities/mode/mode';
import { ROUTES } from '@/shared/constants';
import { KeyFigure, KeyFigures, PageHeader } from '@/ui-kit';

import type { ModePageProps } from './ModePage.types';

import { MODE_FIGURES } from '../config';
import { useModeMeta } from '../model/hooks';
import { ModeTanks, MyModePanel } from './components';

import s from './ModePage.module.scss';

export const ModePage = ({ mode }: ModePageProps) => {
  const t = useTranslations('modes');
  const { data } = useModeMeta(mode);

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumbs={[{ label: t('hub.title'), href: ROUTES.modes.list }, { label: t(`names.${mode}`) }]}
        description={t(`blurbs.${mode}`)}
        meta={data?.season && <ModeSeason season={data.season} />}
        title={t(`names.${mode}`)}
      >
        <KeyFigures>
          <KeyFigure label={t('figures.battles')} value={data?.battles} />
          <KeyFigure label={t('figures.players')} value={data?.players} />
          <KeyFigure label={t('figures.tanks')} value={data?.tanks.length} />
          <KeyFigure format={MODE_FIGURES.winRate} label={t('figures.winRate')} suffix='%' value={data?.winRate} />
        </KeyFigures>
      </PageHeader>
      <MyModePanel mode={mode} />
      <ModeTanks mode={mode} />
      {data && <ModeSourceNote computedAt={data.computedAt} windowDays={data.windowDays} />}
    </div>
  );
};

'use client';

import { StrongholdIcon } from '@otmetki/icons';
import { useTranslations } from 'next-intl';

import { DataSourceNote, PageHero } from '@/ui-kit';

import { useClanLeaders } from '../model/hooks';
import { ClanLeaders, ClanRating, ClanSearch } from './components';

import s from './ClansPage.module.scss';

export const ClansPage = () => {
  const t = useTranslations('clans.head');
  const { isShown, query } = useClanLeaders();

  return (
    <div className={s.root}>
      <PageHero
        actions={<ClanSearch />}
        art={{ kind: 'emblem', glyph: <StrongholdIcon size={480} /> }}
        breadcrumbs={[{ label: t('title') }]}
        lead={t('description')}
        title={t('title')}
      />
      {isShown && <ClanLeaders query={query} />}
      <div className={s.content}>
        <ClanRating />
        <DataSourceNote />
      </div>
    </div>
  );
};

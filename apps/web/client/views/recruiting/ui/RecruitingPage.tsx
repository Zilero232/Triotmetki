'use client';

import { useTranslations } from 'next-intl';

import { PageHeader, Tabs } from '@/ui-kit';

import { RECRUITING_KINDS } from '../config';
import { useRecruitingKind } from '../model/hooks';
import { CreateRecruitingDialog, RecruitingBoard } from './components';

import s from './RecruitingPage.module.scss';

export const RecruitingPage = () => {
  const t = useTranslations('recruiting');
  const { kind, setKind } = useRecruitingKind();

  return (
    <div className={s.root}>
      <PageHeader breadcrumbs={[{ label: t('head.title') }]} description={t('head.description')} title={t('head.title')} />
      <Tabs
        aside={<CreateRecruitingDialog key={kind} kind={kind} />}
        items={RECRUITING_KINDS.map((value) => ({ value, label: t(`tabs.${value}`), content: <RecruitingBoard kind={value} /> }))}
        value={kind}
        onValueChange={(next) => void setKind(next)}
      />
    </div>
  );
};

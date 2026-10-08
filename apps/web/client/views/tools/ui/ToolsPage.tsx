'use client';

import { useTranslations } from 'next-intl';

import { PageHeader } from '@/ui-kit';

import { CalculatorNav, CalculatorPanel } from './components';

import s from './ToolsPage.module.scss';

export const ToolsPage = () => {
  const t = useTranslations('tools.head');

  return (
    <div className={s.root}>
      <PageHeader breadcrumbs={[{ label: t('title') }]} description={t('description')} title={t('title')} />
      <div className={s.layout}>
        <CalculatorNav />
        <CalculatorPanel />
      </div>
    </div>
  );
};

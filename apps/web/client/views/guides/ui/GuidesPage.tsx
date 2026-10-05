'use client';

import { PenLine } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, PageHeader } from '@/ui-kit';

import { GuideTable, MyGuides, TopAuthors } from './components';

import s from './GuidesPage.module.scss';

export const GuidesPage = () => {
  const t = useTranslations('guides.list');
  const tCommon = useTranslations('common');

  return (
    <div className={s.root}>
      <PageHeader
        actions={
          <Link className={buttonVariants({ size: 'sm' })} href={ROUTES.guides.create}>
            <PenLine size={14} />
            {t('write')}
          </Link>
        }
        breadcrumbs={[{ label: tCommon('home'), href: ROUTES.home }, { label: t('title') }]}
        description={t('description')}
        title={t('title')}
      />
      <div className={s.layout}>
        <GuideTable />
        <aside className={s.side}>
          <MyGuides />
          <TopAuthors />
        </aside>
      </div>
    </div>
  );
};

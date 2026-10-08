'use client';

import { Search } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';

import { MOTION_VARIANTS } from '@/shared/lib';
import { FilteredEmptyState, Input, PageHeader } from '@/ui-kit';

import { HUB_PAGE } from '../config';
import { useHubSections } from '../model/hooks';
import { HubSection } from './components';

import s from './HubPage.module.scss';

export const HubPage = () => {
  const t = useTranslations('hub');
  const { query, sections, isFiltered, onQueryChange, onReset } = useHubSections();

  return (
    <div className={s.root}>
      <PageHeader breadcrumbs={[{ label: t('head.title') }]} description={t('head.description')} title={t('head.title')}>
        <div className={s.search} role='search'>
          <Input
            aria-label={t('filter.label')}
            icon={<Search size={HUB_PAGE.searchIconSize} />}
            placeholder={t('filter.placeholder')}
            size='lg'
            type='search'
            value={query}
            wrapperClassName={s.field}
            onChange={onQueryChange}
          />
        </div>
      </PageHeader>
      <AnimatePresence initial={false} mode='popLayout'>
        {sections.map((section, index) => (
          <m.div key={section.key} animate='shown' exit='exit' initial='hidden' layout='position' variants={MOTION_VARIANTS.panel}>
            <HubSection order={index} section={section} />
          </m.div>
        ))}
      </AnimatePresence>
      {sections.length === 0 && (
        <FilteredEmptyState isFramed isFiltered={isFiltered} role='status' title={t('empty', { query: query.trim() })} onReset={onReset} />
      )}
    </div>
  );
};

'use client';

import { useTranslations } from 'next-intl';

import { CommentsThread } from '@/features/community/comments';
import { Markdown } from '@/features/community/markdown';
import { ROUTES } from '@/shared/constants';
import { Card, PageHeader, SkeletonStack } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { GuidePageProps } from './GuidePage.types';

import { GUIDE_PAGE } from '../config';
import { useGuidePage } from '../model/hooks';
import { GuideHeader, GuideProvider } from './components';

import s from './GuidePage.module.scss';

export const GuidePage = ({ slug }: GuidePageProps) => {
  const t = useTranslations('guides.detail');
  const tNav = useTranslations('nav.items');
  const query = useGuidePage(slug);

  return (
    <div className={s.root}>
      <ResourceGate
        error={{ title: t('errorTitle'), description: t('errorDescription') }}
        header={<PageHeader breadcrumbs={[{ label: tNav('guides'), href: ROUTES.guides.list }, { label: slug }]} title={slug} />}
        query={query}
        skeleton={<SkeletonStack className={s.skeleton} heights={GUIDE_PAGE.skeletonHeights} />}
      >
        {(guide) => (
          <GuideProvider guide={guide}>
            <GuideHeader />
            {guide.status !== 'published' && (
              <p className={s.notice} data-status={guide.status}>
                {t(`statusNotice.${guide.status}`)}
              </p>
            )}
            <Card className={s.content} padding='lg'>
              <Markdown>{guide.body}</Markdown>
            </Card>
            {guide.status === 'published' && <CommentsThread className={s.content} target='guide' targetId={guide.id} />}
          </GuideProvider>
        )}
      </ResourceGate>
    </div>
  );
};

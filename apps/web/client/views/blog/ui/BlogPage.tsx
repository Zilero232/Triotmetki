'use client';

import { NotebookPen, PenSquare, Rss } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { BlogPostCard } from '@/entities/blog/post';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Button, buttonVariants, Card, FilteredEmptyState, PageHeader, QueryState, SegmentedControl, ToggleChips } from '@/ui-kit';
import { LeadFeed, LeadFeedSkeleton } from '@/widgets/content/lead-feed';

import { BLOG_PAGE } from '../config';
import { useBlogFeed } from '../model/hooks';

import s from './BlogPage.module.scss';

export const BlogPage = () => {
  const t = useTranslations('blog');
  const feed = useBlogFeed();

  return (
    <div className={s.root}>
      <PageHeader
        actions={
          <div className={s.actions}>
            <a className={buttonVariants({ variant: 'ghost', size: 'sm' })} href={feed.rssHref} rel='alternate' type='application/rss+xml'>
              <Rss aria-hidden size={14} />
              {t('head.rss')}
            </a>
            {feed.canEdit && (
              <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.blog.editor.list}>
                <PenSquare aria-hidden size={14} />
                {t('head.editor')}
              </Link>
            )}
          </div>
        }
        breadcrumbs={[{ label: t('head.title') }]}
        description={t('head.description')}
        emblem={<NotebookPen />}
        title={t('head.title')}
      />
      <div className={s.controls}>
        <SegmentedControl
          aria-label={t('filters.label')}
          className={s.categories}
          options={feed.categoryOptions}
          size='sm'
          value={feed.category}
          onChange={feed.onCategoryChange}
        />
        {feed.tags.length > 0 && (
          <ToggleChips aria-label={t('filters.tags')} options={feed.tags} size='sm' value={feed.selectedTags} onChange={feed.onTagsChange} />
        )}
      </div>
      <QueryState
        empty={
          <Card>
            <FilteredEmptyState
              description={feed.isFiltered ? t('emptyFiltered.description') : t('empty.description')}
              isFiltered={feed.isFiltered}
              resetLabel={t('filters.reset')}
              title={feed.isFiltered ? t('emptyFiltered.title') : t('empty.title')}
              onReset={feed.onReset}
            />
          </Card>
        }
        errorDescription={t('error.description')}
        errorTitle={t('error.title')}
        isEmpty={() => feed.posts.length === 0}
        query={feed.query}
        skeleton={<LeadFeedSkeleton count={BLOG_PAGE.skeletons} height={BLOG_PAGE.skeletonHeight} />}
      >
        <LeadFeed
          itemKey={(post) => post.id}
          items={feed.rest}
          lead={feed.lead && <BlogPostCard isPriority post={feed.lead} variant='lead' />}
          renderItem={(post) => <BlogPostCard post={post} />}
        />
      </QueryState>
      {feed.query.hasNextPage && (
        <Button className={s.more} disabled={feed.query.isFetchingNextPage} variant='secondary' onClick={feed.loadMore}>
          {t('more', { shown: feed.posts.length, total: feed.total })}
        </Button>
      )}
    </div>
  );
};

'use client';

import { useTranslations } from 'next-intl';

import { useReservedHeight } from '@/shared/lib';

import type { PagedListProps } from './PagedList.types';

import { Button, Skeleton } from '../../atoms';
import { ErrorState, RetryButton } from '../../molecules';
import { pagedListVariants } from './PagedList.variants';

import s from './PagedList.module.scss';

export const PagedList = <TItem,>({
  list: { items, isPending, isError, isRetrying, hasNextPage, isFetchingNextPage, loadMore, retry },
  getKey,
  renderItem,
  empty,
  errorTitle,
  errorDescription,
  header,
  moreLabel,
  layout = 'grid',
  skeletonHeight = 148,
  skeletonCount = 2,
  label,
  className
}: PagedListProps<TItem>) => {
  const t = useTranslations('common');
  const { reservedStyle, measureRef } = useReservedHeight();

  const rootClassName = pagedListVariants({ layout, className });

  if (isError && items.length === 0) {
    return (
      <section aria-label={label} className={rootClassName} style={reservedStyle}>
        <ErrorState description={errorDescription} isCompact={layout === 'rows'} isRetrying={isRetrying} title={errorTitle} onRetry={retry} />
      </section>
    );
  }

  if (isPending) {
    return (
      <section aria-busy aria-label={label} className={rootClassName}>
        <div ref={measureRef} className={s.skeletons}>
          <Skeleton count={skeletonCount} height={skeletonHeight} />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section aria-label={label} className={rootClassName} style={reservedStyle}>
        {empty}
      </section>
    );
  }

  return (
    <section aria-busy={isFetchingNextPage || undefined} aria-label={label} className={rootClassName}>
      {header && <p className={s.header}>{header}</p>}
      <ul className={s.list}>
        {items.map((item) => (
          <li key={getKey(item)} className={s.item}>
            {renderItem(item)}
          </li>
        ))}
      </ul>
      {isError ? (
        <div className={s.more} role='alert'>
          <span className={s.moreError}>{t('loadMoreError')}</span>
          <RetryButton disabled={isFetchingNextPage} variant='ghost' onClick={loadMore} />
        </div>
      ) : (
        hasNextPage && (
          <div className={s.more}>
            <Button disabled={isFetchingNextPage} size='sm' variant='secondary' onClick={loadMore}>
              {moreLabel ?? t('showMore')}
            </Button>
          </div>
        )
      )}
    </section>
  );
};

'use client';

import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';

import type { LoadMoreProps } from './LoadMore.types';

import { Button } from '../../atoms';
import { RetryButton } from '../RetryButton';

import s from './LoadMore.module.scss';

export const LoadMore = ({ hasNextPage, isFetchingNextPage, isError, label, className, onLoadMore }: LoadMoreProps) => {
  const t = useTranslations('common');

  if (isError) {
    return (
      <div className={clsx(s.root, className)} role='alert'>
        <span className={s.error}>{t('loadMoreError')}</span>
        <RetryButton disabled={isFetchingNextPage} variant='ghost' onClick={onLoadMore} />
      </div>
    );
  }

  if (!hasNextPage) {
    return null;
  }

  return (
    <div className={clsx(s.root, className)}>
      <Button disabled={isFetchingNextPage} size='sm' variant='secondary' onClick={onLoadMore}>
        {label ?? t('showMore')}
      </Button>
    </div>
  );
};

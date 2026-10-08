'use client';

import { notFound as showNotFoundPage } from 'next/navigation';

import { isNotFoundError } from '@/shared/api/source';
import { QueryState } from '@/ui-kit';

import type { ResourceGateProps } from './ResourceGate.types';

import { ResourceMissing } from '../ResourceMissing';

import s from './ResourceGate.module.scss';

export const ResourceGate = <TData,>({
  query,
  skeleton,
  error,
  notFound,
  back,
  header,
  isNotFound = isNotFoundError(query.error),
  className = s.fallback,
  skeletonClassName = className,
  children
}: ResourceGateProps<TData>) => {
  if (isNotFound && !notFound && query.data === undefined) {
    showNotFoundPage();
  }

  return (
    <QueryState
      errorState={
        <div className={className}>
          {header}
          {isNotFound && notFound ? (
            <ResourceMissing back={back} reason='notFound' {...notFound} />
          ) : (
            <ResourceMissing back={back} isRetrying={query.isRefetching} reason='error' {...error} onRetry={() => void query.refetch()} />
          )}
        </div>
      }
      query={query}
      skeleton={<div className={skeletonClassName}>{skeleton}</div>}
    >
      {children}
    </QueryState>
  );
};

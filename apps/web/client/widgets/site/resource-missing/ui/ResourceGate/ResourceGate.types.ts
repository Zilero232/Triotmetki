import type { QueryObserverBaseResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import type { QueryStateProps, QueryStateSource } from '@/ui-kit';

import type { ResourceMissingProps } from '../ResourceMissing';

type ResourceGateMessage = Pick<ResourceMissingProps, 'description' | 'title'>;

export type ResourceGateProps<TData> = Pick<QueryStateProps<TData>, 'children'> &
  Pick<ResourceMissingProps, 'back'> & {
    query: QueryStateSource<TData> & Partial<Pick<QueryObserverBaseResult<TData>, 'error'>>;
    skeleton: ReactNode;
    header?: ReactNode;
    error: ResourceGateMessage;
    notFound?: ResourceGateMessage;
    isNotFound?: boolean;
    className?: string;
    skeletonClassName?: string;
  };

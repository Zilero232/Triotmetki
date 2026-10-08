import type { PageHeaderFallbackProps } from './PageHeaderFallback.types';

import { PageHeaderSkeleton } from '../PageHeaderSkeleton';

import s from './PageHeaderFallback.module.scss';

export const PageHeaderFallback = ({ hasDescription = true, children }: PageHeaderFallbackProps) => (
  <div className={s.root}>
    <PageHeaderSkeleton hasDescription={hasDescription} />
    {children}
  </div>
);

'use client';

import type { MarksPageProps } from './MarksPage.types';

import { MarksHead } from './components';

import s from './MarksPage.module.scss';

export const MarksPage = ({ figures, children }: MarksPageProps) => (
  <div className={s.root}>
    <MarksHead figures={figures} />
    {children}
  </div>
);

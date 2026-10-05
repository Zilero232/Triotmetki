import clsx from 'clsx';

import type { SiteStateProps } from './SiteState.types';

import { useReplaysT } from '../../../model/hooks';

import s from './SiteState.module.scss';

export const SiteState = ({ state, size }: SiteStateProps) => {
  const t = useReplaysT();

  return <span className={clsx(s.state, s[size], s[state])}>{t(`site_${state}`)}</span>;
};

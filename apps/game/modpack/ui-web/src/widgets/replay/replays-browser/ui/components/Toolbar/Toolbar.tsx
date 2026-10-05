import clsx from 'clsx';

import { REPLAY_FILTER } from '@/entities/replay/replay';
import { Icon, Segmented } from '@/ui-kit';

import type { ToolbarProps } from './Toolbar.types';

import { resultOptions } from '../../../lib/filter-options';
import { useReplaysT } from '../../../model/hooks';
import { ToolbarSearch, ToolbarSort, ToolbarTools } from './components';

import s from './Toolbar.module.scss';

export const Toolbar = ({ browser }: ToolbarProps) => {
  const t = useReplaysT();
  const { filters } = browser;

  return (
    <div className={s.toolbar}>
      <ToolbarSearch browser={browser} />
      <Segmented
        className={s.results}
        items={resultOptions(t)}
        label={t('resultAll')}
        value={filters.result ?? REPLAY_FILTER.all}
        onSelect={(value) => browser.patch({ result: value === REPLAY_FILTER.all ? null : value })}
      />
      <button
        aria-pressed={filters.favourites}
        className={clsx(s.favourites, filters.favourites && s.favouritesOn)}
        type='button'
        onClick={() => browser.patch({ favourites: !filters.favourites })}
      >
        <Icon name='star' size={14} tone={filters.favourites ? 'gold' : 'muted'} />
        <span className={s.favouritesLabel}>{t('favourites')}</span>
      </button>
      <ToolbarSort browser={browser} />
      <ToolbarTools browser={browser} />
    </div>
  );
};

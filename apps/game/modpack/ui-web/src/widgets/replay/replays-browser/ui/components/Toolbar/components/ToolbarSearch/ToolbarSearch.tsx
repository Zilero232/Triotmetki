import { useFieldEscape } from '@/shared/lib/use-field-escape';

import type { ToolbarProps } from '../../Toolbar.types';

import { REPLAYS_BROWSER } from '../../../../../config';
import { useReplaysT } from '../../../../../model/hooks';
import { ReplayIcon } from '../../../ReplayIcon';

import s from './ToolbarSearch.module.scss';

export const ToolbarSearch = ({ browser }: ToolbarProps) => {
  const t = useReplaysT();
  const { query } = browser.filters;
  const clearQuery = () => browser.patch({ query: '' });
  const searchFocus = useFieldEscape({ onEscape: query === '' ? undefined : clearQuery });

  return (
    <div className={s.search}>
      <ReplayIcon className={s.searchIcon} name='search' size={16} />
      <input
        aria-label={t('search')}
        className={s.searchInput}
        maxLength={REPLAYS_BROWSER.searchMaxLength}
        placeholder={t('search')}
        type='text'
        value={query}
        onChange={(event) => browser.patch({ query: event.currentTarget.value })}
        {...searchFocus}
      />
      {query !== '' && (
        <button aria-label={t('clearSearch')} className={s.clear} type='button' onClick={clearQuery}>
          <ReplayIcon name='close' size={12} />
        </button>
      )}
    </div>
  );
};

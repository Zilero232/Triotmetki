import { useT } from '@/entities/window/window-state';
import { IconButton, Input } from '@/ui-kit';

import type { SearchBoxProps } from './SearchBox.types';

import { SEARCH_COMPONENTS } from '../config';
import { useSearchBox } from '../model/hooks';

import s from './SearchBox.module.scss';

export const SearchBox = ({ query, onChange, onClear }: SearchBoxProps) => {
  const t = useT();
  const search = useSearchBox({ query, onClear });

  return (
    <div className={s.search} role='search'>
      <Input
        aria-label={t('searchPlaceholder')}
        className={s.input}
        icon='search'
        inputRef={search.inputRef}
        maxLength={SEARCH_COMPONENTS.maxLength}
        placeholder={t('searchPlaceholder')}
        value={query}
        variant='wide'
        onChange={(event) => onChange(event.currentTarget.value)}
        onEscape={search.onEscape}
      />
      {query ? (
        <IconButton className={s.clear} icon='x' label={t('searchClear')} size='small' variant='ghost' onClick={onClear} />
      ) : (
        <span aria-hidden='true' className={s.key}>
          {t('searchKeyHint')}
        </span>
      )}
    </div>
  );
};

'use client';

import { clsx } from 'clsx';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RetryButton } from '@/ui-kit';

import type { PickableKind } from '../../lib/search-kind';
import type { EntityPickerProps } from './EntityPicker.types';

import { entityId } from '../../lib/entity-id';
import { useEntityPicker } from '../../model/hooks';
import { PickerOption } from '../components';

import s from './EntityPicker.module.scss';

export const EntityPicker = <K extends PickableKind>({
  kind,
  placeholder,
  excludeIds = [],
  size = 'md',
  isDisabled = false,
  className,
  onPick
}: EntityPickerProps<K>) => {
  const t = useTranslations('players.picker');
  const { query, visible, isOpen, isFetching, isError, onQueryChange, onSelect, onOpen, onClose, retry } = useEntityPicker({
    kind,
    excludeIds,
    onPick
  });

  return (
    <Command className={clsx(s.root, s[size], className)} label={placeholder} shouldFilter={false}>
      <div className={s.field} data-busy={isFetching}>
        <Search aria-hidden className={s.icon} size={size === 'lg' ? 16 : 14} />
        <Command.Input
          autoCapitalize='off'
          autoComplete='off'
          autoCorrect='off'
          className={s.input}
          disabled={isDisabled}
          enterKeyHint='search'
          placeholder={placeholder}
          spellCheck={false}
          value={query}
          onBlur={onClose}
          onFocus={onOpen}
          onValueChange={onQueryChange}
        />
      </div>
      {isOpen && (
        <div className={s.popup}>
          <Command.List className={s.list} onMouseDown={(event) => event.preventDefault()}>
            {!isFetching && (
              <Command.Empty className={s.status}>
                {isError ? t('error') : t('empty')}
                {isError && <RetryButton size='sm' variant='ghost' onClick={retry} />}
              </Command.Empty>
            )}
            {visible.map((result) => (
              <Command.Item key={entityId(result)} className={s.item} value={String(entityId(result))} onSelect={() => onSelect(result)}>
                <PickerOption result={result} />
              </Command.Item>
            ))}
          </Command.List>
        </div>
      )}
    </Command>
  );
};

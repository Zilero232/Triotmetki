import { Command } from 'cmdk';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { IconButton, Kbd } from '@/ui-kit';

import type { PaletteInputProps } from './PaletteInput.types';

import s from './PaletteInput.module.scss';

export const PaletteInput = ({ value, isFetching, onValueChange, onClose }: PaletteInputProps) => {
  const t = useTranslations('search');
  const tCommon = useTranslations('common');

  return (
    <div className={s.root}>
      <span aria-hidden className={s.icon} data-busy={isFetching}>
        <Search size={16} />
      </span>
      <Command.Input
        autoCapitalize='off'
        autoComplete='off'
        autoCorrect='off'
        className={s.input}
        enterKeyHint='search'
        placeholder={t('placeholder')}
        spellCheck={false}
        value={value}
        onValueChange={onValueChange}
      />
      <Kbd className={s.esc}>{tCommon('kbd.esc')}</Kbd>
      <IconButton aria-label={tCommon('close')} className={s.close} size='lg' onClick={onClose}>
        <X size={18} />
      </IconButton>
    </div>
  );
};

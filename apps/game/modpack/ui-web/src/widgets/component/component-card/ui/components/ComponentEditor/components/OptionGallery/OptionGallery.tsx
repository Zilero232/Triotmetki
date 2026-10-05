import clsx from 'clsx';

import { ClientIcon, Icon } from '@/ui-kit';

import type { OptionGalleryProps } from './OptionGallery.types';

import { EDITOR } from '../../../../../config';

import s from './OptionGallery.module.scss';

export const OptionGallery = ({ label, options, onSelect, onHint }: OptionGalleryProps) => (
  <div aria-label={label} className={s.gallery} role='group'>
    {options.map((option) => (
      <button
        key={option.value}
        aria-label={option.label}
        aria-pressed={option.selected}
        className={clsx(s.tile, option.selected && s.tileOn)}
        type='button'
        onClick={() => onSelect(option.value)}
        onFocus={() => onHint(option.label)}
        onMouseEnter={() => onHint(option.label)}
      >
        {option.icon ? <ClientIcon icon={option.icon} size={EDITOR.thumbSize} /> : <Icon name='crosshair' size={EDITOR.emptyIconSize} tone='muted' />}
      </button>
    ))}
  </div>
);

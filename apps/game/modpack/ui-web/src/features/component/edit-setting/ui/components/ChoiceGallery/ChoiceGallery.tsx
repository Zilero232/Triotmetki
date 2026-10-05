import clsx from 'clsx';

import { ClientIcon, Icon } from '@/ui-kit';

import type { ChoiceGalleryProps } from './ChoiceGallery.types';

import { CHOICE_GALLERY } from '../../../config';

import s from './ChoiceGallery.module.scss';

export const ChoiceGallery = ({ field, icons, onSelect }: ChoiceGalleryProps) => (
  <div aria-label={field.label} className={s.gallery} role='group'>
    {field.choices.map((choice) => {
      const icon = icons[choice.value] ?? null;
      const isOn = choice.value === field.value;

      return (
        <button
          key={choice.value}
          aria-label={choice.label}
          aria-pressed={isOn}
          className={clsx(s.tile, isOn && s.tileOn)}
          type='button'
          onClick={() => onSelect(choice.value)}
        >
          <span className={s.art}>
            {icon ? (
              <ClientIcon icon={icon} size={CHOICE_GALLERY.thumbSize} />
            ) : (
              <Icon name={CHOICE_GALLERY.emptyIcon} size={CHOICE_GALLERY.emptyIconSize} tone='muted' />
            )}
          </span>
          <span className={s.label}>{choice.label}</span>
          {isOn && (
            <span className={s.check}>
              <Icon name='check' size={10} tone='contrast' />
            </span>
          )}
        </button>
      );
    })}
  </div>
);

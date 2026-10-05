import clsx from 'clsx';

import type { ChoiceChipsProps } from './ChoiceChips.types';

import s from './ChoiceChips.module.scss';

export const ChoiceChips = ({ field, onSelect }: ChoiceChipsProps) => (
  <div aria-label={field.label} className={s.chips} role='group'>
    {field.choices.map((choice) => (
      <button
        key={choice.value}
        aria-pressed={choice.value === field.value}
        className={clsx(s.chip, choice.value === field.value && s.chipOn)}
        type='button'
        onClick={() => onSelect(choice.value)}
      >
        {choice.label}
      </button>
    ))}
  </div>
);

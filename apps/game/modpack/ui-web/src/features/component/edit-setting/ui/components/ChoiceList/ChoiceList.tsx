import clsx from 'clsx';

import { Icon } from '@/ui-kit';

import type { ChoiceListProps } from './ChoiceList.types';

import s from './ChoiceList.module.scss';

export const ChoiceList = ({ field, onSelect }: ChoiceListProps) => (
  <div aria-label={field.label} className={s.list} role='group'>
    {field.choices.map((choice) => (
      <button
        key={choice.value}
        aria-pressed={choice.value === field.value}
        className={clsx(s.choice, choice.value === field.value && s.choiceOn)}
        type='button'
        onClick={() => onSelect(choice.value)}
      >
        <span className={clsx(s.mark, choice.value === field.value && s.markOn)}>
          {choice.value === field.value && <Icon name='check' size={12} tone='contrast' />}
        </span>
        <span className={s.label}>{choice.label}</span>
      </button>
    ))}
  </div>
);

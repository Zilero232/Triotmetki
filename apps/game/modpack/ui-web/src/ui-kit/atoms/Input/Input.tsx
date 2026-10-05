import clsx from 'clsx';

import { useFieldEscape } from '@/shared/lib/use-field-escape';

import type { InputProps } from './Input.types';

import { Icon } from '../Icon';

import s from './Input.module.scss';

export const Input = ({ variant = 'default', className, placeholder, value, icon, inputRef, onEscape, onFocus, onBlur, ...props }: InputProps) => {
  const focus = useFieldEscape({ onEscape, onFocus, onBlur });

  return (
    <span className={clsx(s.field, s[variant], className)}>
      <input ref={inputRef} className={clsx(s.input, icon && s.inputWithIcon)} type='text' value={value} {...props} {...focus} />
      {icon && <Icon className={s.icon} name={icon} size={16} />}
      {placeholder && !value && (
        <span aria-hidden='true' className={clsx(s.placeholder, icon && s.placeholderWithIcon)}>
          {placeholder}
        </span>
      )}
    </span>
  );
};

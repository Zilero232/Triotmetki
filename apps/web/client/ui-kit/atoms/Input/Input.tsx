'use client';

import { Input as BaseInput } from '@base-ui/react/input';
import { clsx } from 'clsx';

import { useFormControl } from '@/shared/lib';

import type { InputProps } from './Input.types';

import s from './Input.module.scss';

export const Input = ({ icon, trailing, size = 'md', isInvalid = false, className, wrapperClassName, ...props }: InputProps) => {
  const control = useFormControl();

  return (
    <span className={clsx(s.root, s[size], wrapperClassName)} data-invalid={isInvalid || control['aria-invalid'] || undefined}>
      {icon && (
        <span aria-hidden className={s.icon}>
          {icon}
        </span>
      )}
      <BaseInput {...control} aria-invalid={isInvalid || control['aria-invalid'] || undefined} className={clsx(s.control, className)} {...props} />
      {trailing}
    </span>
  );
};

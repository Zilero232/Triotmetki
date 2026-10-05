'use client';

import { clsx } from 'clsx';

import { FormControlContext, useFormField } from '@/shared/lib';

import type { FormFieldProps } from './FormField.types';

import s from './FormField.module.scss';

export const FormField = ({ label, children, hint, error, htmlFor, className }: FormFieldProps) => {
  const { controlId, hintId, errorId, control } = useFormField({ htmlFor, hasHint: Boolean(hint), hasError: Boolean(error) });

  return (
    <div className={clsx(s.root, className)}>
      <label className={s.label} htmlFor={controlId}>
        {label}
      </label>
      <FormControlContext value={control}>{children}</FormControlContext>
      {error && (
        <p className={s.error} id={errorId} role='alert'>
          {error}
        </p>
      )}
      {hint && (
        <p className={s.hint} id={hintId}>
          {hint}
        </p>
      )}
    </div>
  );
};

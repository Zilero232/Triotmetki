'use client';

import { NumberField as BaseNumberField } from '@base-ui/react/number-field';
import { clsx } from 'clsx';
import { Minus, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';

import { useFormControl } from '@/shared/lib';

import type { NumberFieldProps } from './NumberField.types';

import s from './NumberField.module.scss';

export const NumberField = ({
  value,
  label,
  min,
  max,
  step = 1,
  suffix,
  hint,
  format,
  className,
  'aria-label': ariaLabel,
  onValueChange
}: NumberFieldProps) => {
  const t = useTranslations('common.numberField');
  const ownId = useId();
  const locale = useLocale();
  const control = useFormControl();

  const id = control.id ?? ownId;

  return (
    <BaseNumberField.Root
      className={clsx(s.root, className)}
      format={format}
      id={id}
      locale={locale}
      max={max}
      min={min}
      step={step}
      value={value}
      onValueChange={onValueChange}
    >
      {label && (
        <label className={s.label} htmlFor={id}>
          {label}
        </label>
      )}
      <BaseNumberField.Group className={s.group} data-invalid={control['aria-invalid'] || undefined}>
        <BaseNumberField.Decrement aria-label={t('decrement')} className={s.step}>
          <Minus size={14} />
        </BaseNumberField.Decrement>
        <BaseNumberField.Input
          aria-describedby={control['aria-describedby']}
          aria-invalid={control['aria-invalid']}
          aria-label={ariaLabel}
          className={s.input}
        />
        {suffix && <span className={s.suffix}>{suffix}</span>}
        <BaseNumberField.Increment aria-label={t('increment')} className={s.step}>
          <Plus size={14} />
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
      {hint && <span className={s.hint}>{hint}</span>}
    </BaseNumberField.Root>
  );
};

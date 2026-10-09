'use client';

import { clsx } from 'clsx';
import { useFormatter, useLocale } from 'next-intl';

import { FORMATS } from '@/shared/i18n';
import { deltaView, unitSuffix } from '@/shared/lib';

import type { DeltaValueProps } from './DeltaValue.types';

import { DELTA_VALUE } from './DeltaValue.constants';

import s from './DeltaValue.module.scss';

export const DeltaValue = ({
  value,
  verdict,
  isLowerBetter = false,
  isSameShown = false,
  format = 'signed',
  suffix = '',
  className
}: DeltaValueProps) => {
  const formatter = useFormatter();
  const locale = useLocale();
  const options: Intl.NumberFormatOptions = typeof format === 'string' ? FORMATS.number[format] : { ...DELTA_VALUE.format, ...format };
  const { isKnown, verdict: resolved, shown } = deltaView({ value, verdict, isLowerBetter, options });
  const unit = unitSuffix({ suffix, locale }) ?? '';

  return (
    <span className={clsx(s.root, className)} data-verdict={isKnown ? resolved : 'same'}>
      {!isKnown && DELTA_VALUE.missing}
      {isKnown && (resolved !== 'same' || isSameShown) && `${formatter.number(shown, options)}${unit}`}
    </span>
  );
};

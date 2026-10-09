'use client';

import NumberFlow from '@number-flow/react';
import { useLocale } from 'next-intl';

import { flowFormat, unitSuffix } from '@/shared/lib';

import type { AnimatedNumberProps } from './AnimatedNumber.types';

export const AnimatedNumber = ({ value, format, prefix, suffix, className }: AnimatedNumberProps) => {
  const locale = useLocale();

  return (
    <NumberFlow
      className={className}
      format={flowFormat(format)}
      locales={locale}
      prefix={prefix}
      suffix={unitSuffix({ suffix, locale })}
      value={value}
    />
  );
};

'use client';

import { RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { RetryButtonProps } from './RetryButton.types';

import { Button } from '../../atoms';

import s from './RetryButton.module.scss';

export const RetryButton = ({ variant = 'secondary', size = 'sm', disabled, ...props }: RetryButtonProps) => {
  const t = useTranslations('common');

  return (
    <Button aria-busy={disabled || undefined} disabled={disabled} size={size} variant={variant} {...props}>
      <RotateCw aria-hidden className={s.icon} />
      {t('retry')}
    </Button>
  );
};

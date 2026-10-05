'use client';

import { Pin, PinOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { memo } from 'react';

import { Button, IconButton } from '@/ui-kit';

import type { PinToggleProps } from './PinToggle.types';

import { PIN_ROWS } from '../../config';
import { usePinToggle } from '../../model/hooks';

import s from './PinToggle.module.scss';

export const PinToggle = memo(({ variant = 'icon', ...props }: PinToggleProps) => {
  const t = useTranslations('common.pin');
  const { label, onToggle } = usePinToggle(props);

  const Icon = props.isOn ? PinOff : Pin;

  if (variant === 'button') {
    return (
      <Button aria-pressed={props.isOn} className={s.root} data-on={props.isOn} size='sm' title={label} variant='secondary' onClick={onToggle}>
        <Icon aria-hidden size={PIN_ROWS.iconSize} />
        {props.isOn ? t('buttonOn') : t('button')}
      </Button>
    );
  }

  return (
    <IconButton
      aria-label={label}
      aria-pressed={props.isOn}
      className={s.root}
      data-on={props.isOn}
      isActive={props.isOn}
      size='sm'
      title={label}
      onClick={onToggle}
    >
      <Icon aria-hidden size={PIN_ROWS.iconSize} />
    </IconButton>
  );
});

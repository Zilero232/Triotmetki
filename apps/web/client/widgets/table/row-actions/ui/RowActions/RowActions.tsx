'use client';

import { useTranslations } from 'next-intl';

import { PinToggle } from '@/features/app/pin-rows';
import { CompareToggle } from '@/features/compare/compare-selection';
import { RowMenu } from '@/ui-kit';

import type { RowActionsProps } from './RowActions.types';

export const RowActions = ({ name, pin, compare }: RowActionsProps) => {
  const t = useTranslations('common.rowActions');

  return (
    <RowMenu label={t('open', { name })} title={name}>
      {pin && <PinToggle {...pin} name={name} variant='button' />}
      {compare && <CompareToggle entry={compare} variant='button' />}
    </RowMenu>
  );
};

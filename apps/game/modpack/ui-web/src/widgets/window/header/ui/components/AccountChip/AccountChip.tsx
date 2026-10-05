import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { useTooltip } from '@/shared/lib/use-tooltip';
import { Icon } from '@/ui-kit';

import type { AccountChipProps } from './AccountChip.types';

import { HEADER } from '../../../config';

import s from './AccountChip.module.scss';

export const AccountChip = ({ account, compact, onOpen }: AccountChipProps) => {
  const t = useT();
  const tip = useTooltip(t(account.hint));

  return (
    <button aria-label={account.label} className={clsx(s.chip, compact && s.compact)} type='button' onClick={onOpen} {...tip}>
      <Icon name={account.icon} size={HEADER.chipIconSize} tone={account.tone} />
      {!compact && <span className={s.label}>{account.label}</span>}
    </button>
  );
};

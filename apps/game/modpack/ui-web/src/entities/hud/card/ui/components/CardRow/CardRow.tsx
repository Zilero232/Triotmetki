import clsx from 'clsx';

import { HudText } from '@/ui-kit';

import type { CardRowProps } from './CardRow.types';

import { rowIcon } from '../../../lib/card-view';
import { CardRowLine, CardRowProgress } from './components';

import s from './CardRow.module.scss';

export const CardRow = ({ row }: CardRowProps) => {
  const icon = rowIcon(row);
  const indent = clsx(icon.icon !== null && s.indented);

  return (
    <div className={s.row}>
      <CardRowLine icon={icon} row={row} />
      <HudText className={clsx(s.detail, indent)} text={row.detail} />
      <CardRowProgress className={indent} progress={row.progress} tone={row.progress_tone} />
    </div>
  );
};

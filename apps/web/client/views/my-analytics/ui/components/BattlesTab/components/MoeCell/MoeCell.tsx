import { useFormatter } from 'next-intl';

import { DeltaValue } from '@/ui-kit';

import type { MoeCellProps } from './MoeCell.types';

import s from './MoeCell.module.scss';

export const MoeCell = ({ percent, delta }: MoeCellProps) => {
  const format = useFormatter();

  if (percent === null) {
    return <span className={s.root}>—</span>;
  }

  return (
    <span className={s.root}>
      {format.number(percent / 100, 'percent2')}
      {delta !== null && <DeltaValue className={s.delta} suffix='%' value={delta} />}
    </span>
  );
};

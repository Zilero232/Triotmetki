import clsx from 'clsx';

import type { HitDetailsProps } from './HitDetails.types';

import { HIT_VIEWER } from '../../../config';
import { DetailLine } from './components/DetailLine';

import s from './HitDetails.module.scss';

export const HitDetails = ({ row, labels }: HitDetailsProps) => {
  const isMeasured = row.angle !== HIT_VIEWER.dash;

  return (
    <div className={s.details}>
      <div className={s.head}>
        <span className={s.vehicle}>{row.vehicle}</span>
        <span className={clsx(s.result, s[row.tone])}>{row.result}</span>
      </div>
      <span className={s.part}>{row.part}</span>
      <DetailLine label={labels.shell} value={row.shell} />
      <DetailLine label={labels.angle} value={row.angle} />
      <DetailLine label={labels.nominal} value={row.nominal} />
      <DetailLine label={labels.effective} value={row.armor} />
      <DetailLine label={labels.damage} value={row.damage} />
      {!isMeasured && <span className={s.note}>{labels.no_angle}</span>}
    </div>
  );
};

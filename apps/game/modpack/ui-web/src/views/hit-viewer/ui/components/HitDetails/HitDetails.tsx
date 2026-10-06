import clsx from 'clsx';

import type { HitDetailsProps } from './HitDetails.types';

import { HIT_VIEWER } from '../../../config';
import { DetailLine } from './components/DetailLine';

import s from './HitDetails.module.scss';

export const HitDetails = ({ row, labels }: HitDetailsProps) => {
  const isMeasured = row.angle !== HIT_VIEWER.dash;
  const isDamaging = row.damage !== HIT_VIEWER.dash;

  return (
    <div className={s.details}>
      <div className={clsx(s.head, s[`${row.tone}Head`])}>
        <span className={clsx(s.bar, s[`${row.tone}Fill`])} />
        <div className={s.titles}>
          <span className={s.vehicle}>{row.vehicle}</span>
          <span className={s.sub}>
            <span className={clsx(s.result, s[row.tone])}>{row.result}</span>
            <span className={s.part}>{row.part}</span>
          </span>
        </div>
        <div className={s.damage}>
          <span className={clsx(s.damageValue, !isDamaging && s.damageNone)}>{row.damage}</span>
          <span className={s.damageLabel}>{labels.damage}</span>
        </div>
      </div>
      <div className={s.lines}>
        <DetailLine label={labels.shell} value={row.shell} />
        <DetailLine label={labels.angle} value={row.angle} />
        <DetailLine label={labels.nominal} value={row.nominal} />
        <DetailLine label={labels.effective} value={row.armor} />
      </div>
      {!isMeasured && <span className={s.note}>{labels.no_angle}</span>}
    </div>
  );
};

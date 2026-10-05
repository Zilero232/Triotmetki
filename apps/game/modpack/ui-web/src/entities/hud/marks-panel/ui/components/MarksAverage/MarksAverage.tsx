import { DeltaText } from '@/ui-kit';

import type { MarksAverageProps } from './MarksAverage.types';

import s from './MarksAverage.module.scss';

export const MarksAverage = ({ average }: MarksAverageProps) => {
  if (average === null) {
    return null;
  }

  return (
    <div className={s.line}>
      <span className={s.part}>
        <span className={s.label}>{average.label}</span>
        {average.from}
        <DeltaText className={s.projected} direction={average.direction} text={average.to} />
      </span>
    </div>
  );
};

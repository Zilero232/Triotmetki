import type { MarksAverageProps } from './MarksAverage.types';

import s from './MarksAverage.module.scss';

export const MarksAverage = ({ average, battles }: MarksAverageProps) => {
  if (average === null && battles === null) {
    return null;
  }

  return (
    <div className={s.line}>
      {average !== null && (
        <span className={s.part}>
          <span className={s.label}>{average.label}</span>
          {average.value}
        </span>
      )}
      {battles !== null && (
        <span className={s.battles}>
          <span className={s.label}>{battles.label}</span>
          {battles.value}
        </span>
      )}
    </div>
  );
};

import clsx from 'clsx';

import type { OutcomeFilterProps } from './OutcomeFilter.types';

import s from './OutcomeFilter.module.scss';

export const OutcomeFilter = ({ counts, total, tone, summary, labels, onPick }: OutcomeFilterProps) => (
  <div className={s.filter}>
    <div aria-label={labels.filter} className={s.chips} role='group'>
      <button aria-pressed={tone === null} className={clsx(s.chip, tone === null && s.chipOn)} type='button' onClick={() => onPick(null)}>
        <span className={s.label}>{labels.filter_all}</span>
        <span className={s.count}>{total}</span>
      </button>
      {counts.map((item) => {
        const isOn = item.tone === tone;

        return (
          <button
            key={item.tone}
            aria-pressed={isOn}
            className={clsx(s.chip, isOn && s.chipOn)}
            type='button'
            onClick={() => onPick(isOn ? null : item.tone)}
          >
            <span className={clsx(s.dot, s[`${item.tone}Fill`])} />
            <span className={s.label}>{item.label}</span>
            <span className={s.count}>{item.count}</span>
          </button>
        );
      })}
    </div>
    {summary && (
      <div className={s.summary}>
        <span className={s.figure}>
          <span className={s.figureLabel}>{labels.damage}</span>
          <span className={s.figureValue}>{summary.damage}</span>
        </span>
        {summary.share !== null && (
          <span className={s.figure}>
            <span className={s.figureLabel}>{summary.share_label}</span>
            <span className={s.figureValue}>{`${String(summary.share)}%`}</span>
          </span>
        )}
      </div>
    )}
  </div>
);

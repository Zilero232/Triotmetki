import { useFormatter } from 'next-intl';
import { isIncludedIn } from 'remeda';

import type { MetricCellProps } from './MetricCell.types';

import { METRIC_DIGITS, PERCENT_METRICS } from '../../../../../config';

import s from './MetricCell.module.scss';

export const MetricCell = ({ value, metric }: MetricCellProps) => {
  const format = useFormatter();

  if (value === null) {
    return <span className={s.root}>—</span>;
  }

  const digits = metric ? METRIC_DIGITS[metric] : 0;
  const isPercent = metric !== undefined && isIncludedIn(metric, PERCENT_METRICS);
  const text = isPercent
    ? format.number(value / 100, { style: 'percent', maximumFractionDigits: digits })
    : format.number(value, { maximumFractionDigits: digits });

  return <span className={s.root}>{text}</span>;
};

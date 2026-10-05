import type { ReportChartProps } from './ReportChart.types';

import s from './ReportChart.module.scss';

export const ReportChart = ({ chart }: ReportChartProps) => {
  if (chart === null) {
    return null;
  }

  return (
    <div className={s.chart}>
      <span aria-hidden='true' className={s.chartBox}>
        {chart.bars.map((bar) => (
          <span key={bar.key} className={s.bar} style={{ height: bar.height }} />
        ))}
      </span>
      <div className={s.chartScale}>
        <span>{chart.max}</span>
        <span>{chart.min}</span>
      </div>
    </div>
  );
};

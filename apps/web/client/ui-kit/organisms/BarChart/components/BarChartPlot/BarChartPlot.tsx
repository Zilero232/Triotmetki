'use client';

import { seriesTone } from '@/shared/lib';
import { useBarChartLayout } from '@/shared/lib/use-bar-chart-layout';

import type { BarChartPlotProps } from '../../BarChart.types';

import { ChartCanvas } from '../../../ChartKit/components/ChartCanvas';

import s from '../../../ChartKit/ChartKit.module.scss';

export const BarChartPlot = ({ yDomain, ...plot }: BarChartPlotProps) => {
  const { layout, pointer, inner } = useBarChartLayout({ ...plot, yDomain });

  const { xScale, yScale } = layout;

  return (
    <ChartCanvas {...layout} {...pointer} {...plot}>
      {plot.series.map((item, seriesIndex) => (
        <g key={item.id} className={s.series} data-tone={seriesTone({ tone: item.tone, index: seriesIndex })}>
          {plot.labels.map((label, index) => {
            const top = yScale(Math.max(item.values[index] ?? 0, 0));

            return (
              <rect
                key={label}
                className={s.bar}
                data-active={pointer.hover?.index === index}
                height={Math.max(yScale(0) - top, 0)}
                rx={1}
                width={inner.bandwidth()}
                x={(xScale(label) ?? 0) + (inner(item.id) ?? 0)}
                y={top}
              />
            );
          })}
        </g>
      ))}
    </ChartCanvas>
  );
};

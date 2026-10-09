'use client';

import { curveMonotoneX } from '@visx/curve';
import { AreaClosed, LinePath } from '@visx/shape';

import { seriesTone } from '@/shared/lib';
import { useLineChartLayout } from '@/shared/lib/use-line-chart-layout';

import type { LineChartPlotProps } from '../../LineChart.types';

import { ChartCanvas } from '../../../ChartKit/components/ChartCanvas';

import s from '../../../ChartKit/ChartKit.module.scss';

export const LineChartPlot = ({ yDomain, withArea = false, ...plot }: LineChartPlotProps) => {
  const { layout, pointer } = useLineChartLayout({ ...plot, yDomain });

  const { innerHeight, xScale, yScale } = layout;
  const { hover } = pointer;

  return (
    <ChartCanvas {...layout} {...pointer} {...plot}>
      {plot.series.map((item, seriesIndex) => {
        const points = item.values.map((value, index) => ({ index, value }));

        return (
          <g key={item.id} className={s.series} data-tone={seriesTone({ tone: item.tone, index: seriesIndex })}>
            {withArea && (
              <AreaClosed curve={curveMonotoneX} data={points} x={(point) => xScale(point.index)} y={(point) => yScale(point.value)} yScale={yScale}>
                {({ path }) => <path className={s.area} d={path(points) ?? ''} />}
              </AreaClosed>
            )}
            <LinePath curve={curveMonotoneX} data={points} x={(point) => xScale(point.index)} y={(point) => yScale(point.value)}>
              {({ path }) => <path className={s.line} d={path(points) ?? ''} />}
            </LinePath>
            {hover && <circle className={s.dot} cx={xScale(hover.index)} cy={yScale(item.values[hover.index] ?? 0)} r={3} />}
          </g>
        );
      })}
      {hover && <line className={s.crosshair} x1={xScale(hover.index)} x2={xScale(hover.index)} y1={0} y2={innerHeight} />}
    </ChartCanvas>
  );
};

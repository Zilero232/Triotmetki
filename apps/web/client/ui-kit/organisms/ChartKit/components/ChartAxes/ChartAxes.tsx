import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';

import { CHART } from '@/shared/lib';
import { tickIndices } from '@/shared/lib/chart-scale';

import type { ChartAxesProps } from '../../ChartKit.types';

import s from '../../ChartKit.module.scss';

export const ChartAxes = ({ xScale, yScale, labels, innerWidth, innerHeight, formatValue }: ChartAxesProps) => {
  const indices = tickIndices(labels.length);
  const isBand = 'bandwidth' in xScale;

  return (
    <>
      <GridRows className={s.grid} numTicks={CHART.yTicks} scale={yScale} width={innerWidth} />
      <AxisLeft
        hideAxisLine
        hideTicks
        axisClassName={s.axis}
        numTicks={CHART.yTicks}
        scale={yScale}
        tickFormat={(value) => formatValue(Number(value))}
      />
      {isBand ? (
        <AxisBottom hideTicks axisClassName={s.axis} scale={xScale} tickValues={indices.map((index) => labels[index])} top={innerHeight} />
      ) : (
        <AxisBottom
          hideTicks
          axisClassName={s.axis}
          scale={xScale}
          tickFormat={(value) => labels[Number(value)] ?? ''}
          tickValues={indices}
          top={innerHeight}
        />
      )}
    </>
  );
};

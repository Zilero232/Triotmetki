import { curveMonotoneX } from '@visx/curve';
import { AreaClosed, LinePath } from '@visx/shape';

import { sparklineLayout } from '@/shared/lib/chart-scale';

import type { SparklinePathsProps } from './SparklinePaths.types';

import { SPARKLINE } from '../../Sparkline.constants';

import s from '../../Sparkline.module.scss';

export const SparklinePaths = ({ data, width, height, withArea }: SparklinePathsProps) => {
  const { points, x, y } = sparklineLayout({ data, width, height, pad: SPARKLINE.pad });

  return (
    <>
      {withArea && (
        <AreaClosed curve={curveMonotoneX} data={points} x={(point) => x(point.index)} y={(point) => y(point.value)} yScale={y}>
          {({ path }) => <path className={s.area} d={path(points) ?? ''} />}
        </AreaClosed>
      )}
      <LinePath curve={curveMonotoneX} data={points} x={(point) => x(point.index)} y={(point) => y(point.value)}>
        {({ path }) => <path className={s.line} d={path(points) ?? ''} />}
      </LinePath>
    </>
  );
};

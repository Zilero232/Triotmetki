'use client';

import dynamic from 'next/dynamic';

import type { LineChartProps } from './LineChart.types';

import { ChartFrame } from '../ChartKit';

const LineChartPlot = dynamic(() => import('./components').then((module) => module.LineChartPlot), { ssr: false });

export const LineChart = ({ yDomain, withArea = false, ...props }: LineChartProps) => (
  <ChartFrame {...props}>{(plot) => <LineChartPlot {...plot} withArea={withArea} yDomain={yDomain} />}</ChartFrame>
);

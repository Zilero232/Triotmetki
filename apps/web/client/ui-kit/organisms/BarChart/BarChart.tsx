'use client';

import dynamic from 'next/dynamic';

import type { BarChartProps } from './BarChart.types';

import { ChartFrame } from '../ChartKit';

const BarChartPlot = dynamic(() => import('./components').then((module) => module.BarChartPlot), { ssr: false });

export const BarChart = ({ yDomain, ...props }: BarChartProps) => (
  <ChartFrame {...props}>{(plot) => <BarChartPlot {...plot} yDomain={yDomain} />}</ChartFrame>
);

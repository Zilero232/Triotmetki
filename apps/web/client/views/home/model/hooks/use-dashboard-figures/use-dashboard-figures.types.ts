import type { StatsBlock } from '@otmetki/schemas';

export type UseDashboardFiguresInput = {
  overall: StatsBlock;
  week: StatsBlock | null;
};

export type WeeklyInput = {
  value: number | null | undefined;
  text: (known: number) => string;
};

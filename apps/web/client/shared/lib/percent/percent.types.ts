import type { useFormatter } from 'next-intl';

export type PercentFormatter = Pick<ReturnType<typeof useFormatter>, 'number'>;

export type PercentTextInput = {
  format: PercentFormatter;
  value: number | null | undefined;
  digits?: number;
};

export type UnitSuffixInput = {
  suffix: string | undefined;
  locale: string;
};

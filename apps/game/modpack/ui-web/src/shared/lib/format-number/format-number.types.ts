export type FormatPercentInput = { value: number; digits: number; signed?: boolean; unit?: boolean };

export type OptionalPercentInput = { value: number | null; digits: number };

export type PercentSignInput = { value: number; rounded: number; signed: boolean };

export type Trend = 'falling' | 'flat' | 'rising';

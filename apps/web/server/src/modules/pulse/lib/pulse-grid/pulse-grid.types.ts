export type ActivityRow = {
  weekday: number;
  hour: number;
  players: number;
};

export type Sample = {
  at: Date;
  players: number;
};

export type BestHour = {
  hour: number;
  share: number;
};

export type BestHoursInput = {
  grid: readonly (readonly number[])[];
  count: number;
};

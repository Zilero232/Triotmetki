export type ContourInput = {
  seed: number;
  cols: number;
  rows: number;
  levels: readonly number[];
};

export type Mote = {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  isSmoke: boolean;
};

export type CreateMotesInput = {
  seed: number;
  dust: number;
  smoke: number;
};

export type StepMotesInput = {
  motes: Mote[];
  seconds: number;
};

export type Tracer = {
  from: readonly [number, number];
  to: readonly [number, number];
  born: number;
  life: number;
  tail: number;
};

export type CreateTracerInput = {
  random: () => number;
  now: number;
  life: number;
};

export type TracerSegmentInput = {
  tracer: Tracer;
  now: number;
};

export type TracerSegment = {
  head: readonly [number, number];
  tail: readonly [number, number];
  fade: number;
};

export type CrossingInput = {
  a: number;
  b: number;
  level: number;
};

export type WrapInput = {
  value: number;
  margin: number;
};

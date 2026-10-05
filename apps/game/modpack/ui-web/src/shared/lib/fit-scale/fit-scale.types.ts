export type FitSize = { width: number; height: number };

export type FitScaleInput = {
  frame: FitSize;
  content: FitSize;
  max?: number;
};

export type FitPlacement = {
  scale: number;
  x: number;
  y: number;
  measured: boolean;
};

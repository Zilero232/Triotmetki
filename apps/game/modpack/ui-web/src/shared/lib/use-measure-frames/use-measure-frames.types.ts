export type UseMeasureFramesInput = {
  measure: () => void;
  frames: number;
  restartKey: unknown;
  isEnabled?: boolean;
  skipsFirst?: boolean;
};

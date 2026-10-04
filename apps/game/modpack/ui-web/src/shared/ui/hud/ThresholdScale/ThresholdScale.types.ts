export type ThresholdScaleProps = {
  value: number | null;
  cursor?: number | null;
  levels: readonly number[];
  labels?: boolean;
  width: number;
  className?: string;
};

export type UseIntFieldInput = {
  value: number;
  min: number | null;
  max: number | null;
  onCommit: (next: number) => void;
};

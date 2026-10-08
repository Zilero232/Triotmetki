export type CompactErrorViewProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

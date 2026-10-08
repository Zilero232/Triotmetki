export type ErrorViewProps = {
  error: Error & { digest?: string };
  reset: () => void;
  withAttribution?: boolean;
};

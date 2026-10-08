import type { useEconomyCalculator } from '../../../../../model/hooks';

export type RealMediansProps = Pick<ReturnType<typeof useEconomyCalculator>, 'medians' | 'vehicle'> & {
  isPending: boolean;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
};

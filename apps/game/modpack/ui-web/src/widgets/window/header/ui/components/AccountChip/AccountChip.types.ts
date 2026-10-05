import type { useHeader } from '../../../model/hooks';

export type AccountChipProps = {
  account: NonNullable<ReturnType<typeof useHeader>['account']>;
  compact: boolean;
  onOpen: () => void;
};

import type { UiPage } from '@/shared/api/protocol';

import type { RunActionInput } from '../../../model/hooks';

export type ListPageProps = {
  page: UiPage;
  compact?: boolean;
  onRun: (input: RunActionInput) => void;
};

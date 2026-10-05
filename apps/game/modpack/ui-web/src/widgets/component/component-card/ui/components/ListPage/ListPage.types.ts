import type { UiPage } from '@/shared/api/protocol';

import type { RunActionInput } from '../../../model/hooks';

export type ListPageProps = {
  page: UiPage;
  onRun: (input: RunActionInput) => void;
};

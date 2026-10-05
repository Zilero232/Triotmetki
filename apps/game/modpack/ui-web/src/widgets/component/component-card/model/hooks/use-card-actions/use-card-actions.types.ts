import type { UiAction } from '@/shared/api/protocol';

export type RunActionInput = {
  action: UiAction;
  row?: string;
  value?: string;
};

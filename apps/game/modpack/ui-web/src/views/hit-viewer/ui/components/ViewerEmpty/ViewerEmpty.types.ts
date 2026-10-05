import type { ViewerState } from '../../../lib/viewer-protocol';

export type ViewerEmptyProps = {
  labels: ViewerState['labels'];
  onClose: () => void;
};

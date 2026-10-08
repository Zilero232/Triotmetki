import type { ArmorCamera, ArmorLabels } from '../../../lib/armor-protocol';

export type CameraBarProps = {
  cameras: readonly ArmorCamera[];
  labels: ArmorLabels;
  onCamera: (preset: string) => void;
  onSite: () => void;
};

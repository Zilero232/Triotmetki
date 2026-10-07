import type { ViewerProfile } from '../../../lib/viewer-protocol';

export type ArmorProfileProps = {
  profile: ViewerProfile;
  labels: Record<string, string>;
  isOpen: boolean;
  onToggle: () => void;
};

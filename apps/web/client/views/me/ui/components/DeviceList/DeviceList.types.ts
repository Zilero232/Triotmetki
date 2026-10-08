import type { ModDevice } from '@otmetki/schemas';

export type DeviceListProps = {
  devices: ModDevice[];
  revokingId: string | null;
  onRevoke: (id: string) => void;
};

import type { GameEvent, VehicleSource } from '../../../../generated';

export type VehicleSourceRow = VehicleSource & {
  event: Pick<GameEvent, 'endsAt' | 'slug' | 'startsAt' | 'title' | 'url'> | null;
};

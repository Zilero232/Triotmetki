import type { Vector3 } from '../binary/byte-reader.types';

export type PacketFrame = {
  payload: Uint8Array;
  time: number;
  type: number;
};

export type PositionPayloadInput = {
  entityId: number;
  position: Vector3;
  vehicleId: number;
  yaw: number;
};

export type EntityMethodPayloadInput = {
  args: Uint8Array;
  entityId: number;
  methodId: number;
};

export type BuildReplayInput = {
  blocks: readonly unknown[];
  packets?: readonly Uint8Array[];
};

export type HealthChangedArgsInput = {
  attackerId: number;
  newHealth: number;
  oldHealth: number;
};

export type PeriodFrameInput = {
  period: number;
  time: number;
};

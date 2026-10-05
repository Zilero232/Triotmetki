import type { Vector3 } from '../binary/byte-reader.types';
import type { ReplayInput } from '../replay/replay.types';
import type { ReplayGame, ReplaySummary } from '../summary/summary.types';

export type VehicleMethodIds = {
  onHealthChanged: number;
  showDamageFromShot: number;
  showShooting: number;
};

export type RawPacket = {
  offset: number;
  payload: Uint8Array;
  time: number;
  type: number;
};

type PacketBase = {
  offset: number;
  time: number;
  type: number;
};

export type PositionPacket = PacketBase & {
  kind: 'position';
  entityId: number;
  isVolatile: boolean;
  pitch: number;
  position: Vector3;
  positionError: Vector3;
  roll: number;
  vehicleId: number;
  yaw: number;
};

export type ChatPacket = PacketBase & {
  kind: 'chat';
  html: string;
  text: string;
};

export type GameVersionPacket = PacketBase & {
  kind: 'gameVersion';
  version: string;
};

export type BattlePeriodPacket = PacketBase & {
  kind: 'battlePeriod';
  period: number;
};

export type BasePlayerCreatePacket = PacketBase & {
  kind: 'basePlayerCreate';
  entityId: number;
  entityTypeId: number;
  data: Uint8Array;
};

export type EntityCreatePacket = PacketBase & {
  kind: 'entityCreate';
  direction: Vector3;
  entityId: number;
  entityTypeId: number;
  position: Vector3;
  spaceId: number;
  vehicleId: number;
  data: Uint8Array;
};

export type EntityPropertyPacket = PacketBase & {
  kind: 'entityProperty';
  entityId: number;
  propertyId: number;
  value: Uint8Array;
};

export type EntityMethodPacket = PacketBase & {
  kind: 'entityMethod';
  args: Uint8Array;
  entityId: number;
  methodId: number;
};

export type HealthChangedPacket = PacketBase & {
  kind: 'healthChanged';
  attackerId: number;
  attackReason: number;
  damage: number | null;
  destroyed: boolean;
  newHealth: number;
  oldHealth: number | null;
  vehicleId: number;
};

export type ShotPacket = PacketBase & {
  kind: 'shot';
  burstCount: number;
  gunIndex: number | null;
  vehicleId: number;
};

export type DamageFromShotPacket = PacketBase & {
  kind: 'damageFromShot';
  attackerId: number;
  effectsIndex: number | null;
  hitPoints: number;
  vehicleId: number;
};

export type EndOfStreamPacket = PacketBase & {
  kind: 'endOfStream';
};

export type UnknownPacket = PacketBase & {
  kind: 'unknown';
  error: string | null;
  payload: Uint8Array;
};

export type ReplayPacket =
  | BasePlayerCreatePacket
  | BattlePeriodPacket
  | ChatPacket
  | DamageFromShotPacket
  | EndOfStreamPacket
  | EntityCreatePacket
  | EntityMethodPacket
  | EntityPropertyPacket
  | GameVersionPacket
  | HealthChangedPacket
  | PositionPacket
  | ShotPacket
  | UnknownPacket;

export type ReplayPacketKind = ReplayPacket['kind'];

export type PacketSupportStatus = 'best-effort' | 'unsupported' | 'verified';

export type PacketSupport = {
  game: ReplayGame;
  methodIds: VehicleMethodIds | null;
  methodIdSource: 'custom' | 'none' | 'wg-table';
  notes: string[];
  status: PacketSupportStatus;
  version: string | null;
};

export type ParsePacketsInput = {
  kinds?: readonly ReplayPacketKind[];
  methodIds?: VehicleMethodIds;
  replay: ReplayInput;
};

export type ParsedPackets = {
  battleStartTime: number | null;
  complete: boolean;
  counts: Record<number, number>;
  endTime: number | null;
  packets: ReplayPacket[];
  summary: ReplaySummary;
  support: PacketSupport;
  warnings: string[];
};

export type DecodeContext = {
  health: Map<number, number>;
  methodIds: VehicleMethodIds | null;
  vehicleIds: ReadonlySet<number>;
};

export type DecodePacketInput = {
  context: DecodeContext;
  packet: RawPacket;
};

export type DecodeVehicleMethodInput = {
  base: PacketBase;
  context: DecodeContext;
  method: EntityMethodPacket;
};

export type ResolveSupportInput = {
  game: ReplayGame;
  methodIds: VehicleMethodIds | undefined;
  version: readonly number[] | null;
};

export type CompareVersionsInput = {
  left: readonly number[];
  right: readonly number[];
};

export type TrackPoint = {
  pitch: number;
  roll: number;
  time: number;
  x: number;
  y: number;
  yaw: number;
  z: number;
};

export type CollectTracksInput = {
  packets: readonly ReplayPacket[];
  vehicleIds?: ReadonlySet<number>;
};

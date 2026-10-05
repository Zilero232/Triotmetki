import type { DecodePacketInput, DecodeVehicleMethodInput, EntityMethodPacket, RawPacket, ReplayPacket } from './packets.types';

import { ByteReader } from '../binary/byte-reader';
import { PACKET_TYPE } from './packets.constants';
import { htmlToText } from './packets.support';

const decoder = new TextDecoder('utf-8');

const baseOf = (packet: RawPacket) => ({ offset: packet.offset, time: packet.time, type: packet.type });

const readString = (reader: ByteReader) => decoder.decode(reader.take(reader.u32()));

const decodeVehicleMethod = ({ base, context, method }: DecodeVehicleMethodInput): ReplayPacket => {
  const ids = context.methodIds;

  if (!ids || !context.vehicleIds.has(method.entityId)) {
    return method;
  }

  const reader = new ByteReader(method.args);
  const size = method.args.byteLength;

  if (method.methodId === ids.onHealthChanged && size >= 7) {
    const newHealth = reader.i16();
    const oldHealth = size >= 9 ? reader.i16() : null;
    const attackerId = reader.i32();
    const attackReason = reader.u8();
    const previous = oldHealth ?? context.health.get(method.entityId) ?? null;
    const remaining = Math.max(newHealth, 0);

    context.health.set(method.entityId, remaining);

    return {
      ...base,
      kind: 'healthChanged',
      attackerId,
      attackReason,
      damage: previous === null ? null : Math.max(previous - remaining, 0),
      destroyed: newHealth <= 0,
      newHealth,
      oldHealth,
      vehicleId: method.entityId
    };
  }

  if (method.methodId === ids.showShooting && size >= 1 && size <= 2) {
    const burstCount = reader.u8();

    return {
      ...base,
      kind: 'shot',
      burstCount,
      gunIndex: reader.remaining > 0 ? reader.u8() : null,
      vehicleId: method.entityId
    };
  }

  if (method.methodId === ids.showDamageFromShot && size >= 5) {
    const attackerId = reader.i32();
    const hitPoints = reader.packedLength();

    reader.take(hitPoints * 8);

    return {
      ...base,
      kind: 'damageFromShot',
      attackerId,
      effectsIndex: reader.remaining > 0 ? reader.u8() : null,
      hitPoints,
      vehicleId: method.entityId
    };
  }

  return method;
};

const decodeEntityCreate = (packet: RawPacket): ReplayPacket => {
  const reader = new ByteReader(packet.payload);
  const entityId = reader.i32();
  const entityTypeId = reader.u16();
  const vehicleId = reader.i32();
  const spaceId = reader.i32();

  reader.i32();

  const position = reader.vector3();
  const direction = reader.vector3();

  return {
    ...baseOf(packet),
    kind: 'entityCreate',
    entityId,
    entityTypeId,
    vehicleId,
    spaceId,
    position,
    direction,
    data: reader.rest()
  };
};

const decodePosition = (packet: RawPacket): ReplayPacket => {
  const reader = new ByteReader(packet.payload);
  const entityId = reader.i32();
  const vehicleId = reader.i32();
  const position = reader.vector3();
  const positionError = reader.vector3();
  const yaw = reader.f32();
  const pitch = reader.f32();
  const roll = reader.f32();

  return {
    ...baseOf(packet),
    kind: 'position',
    entityId,
    vehicleId,
    position,
    positionError,
    yaw,
    pitch,
    roll,
    isVolatile: reader.remaining > 0 && reader.u8() !== 0
  };
};

const decodeKnown = ({ context, packet }: DecodePacketInput): ReplayPacket | null => {
  const base = baseOf(packet);
  const reader = new ByteReader(packet.payload);

  switch (packet.type) {
    case PACKET_TYPE.position:
      return decodePosition(packet);

    case PACKET_TYPE.chat: {
      const html = readString(reader);

      return { ...base, kind: 'chat', html, text: htmlToText(html) };
    }

    case PACKET_TYPE.gameVersion:
      return { ...base, kind: 'gameVersion', version: readString(reader) };

    case PACKET_TYPE.battlePeriod:
      return { ...base, kind: 'battlePeriod', period: reader.u32() };

    case PACKET_TYPE.basePlayerCreate: {
      const entityId = reader.i32();
      const entityTypeId = reader.u16();

      return { ...base, kind: 'basePlayerCreate', entityId, entityTypeId, data: reader.rest() };
    }

    case PACKET_TYPE.entityCreate:
      return decodeEntityCreate(packet);

    case PACKET_TYPE.entityProperty: {
      const entityId = reader.i32();
      const propertyId = reader.u32();

      return { ...base, kind: 'entityProperty', entityId, propertyId, value: reader.take(reader.u32()) };
    }

    case PACKET_TYPE.entityMethod: {
      const entityId = reader.i32();
      const methodId = reader.u32();
      const args = reader.take(reader.u32());
      const method: EntityMethodPacket = { ...base, kind: 'entityMethod', entityId, methodId, args };

      return decodeVehicleMethod({ base, context, method });
    }

    case PACKET_TYPE.endOfStream:
      return { ...base, kind: 'endOfStream' };

    default:
      return null;
  }
};

export const decodePacket = ({ context, packet }: DecodePacketInput): ReplayPacket => {
  try {
    return decodeKnown({ context, packet }) ?? { ...baseOf(packet), kind: 'unknown', error: null, payload: packet.payload };
  } catch (error) {
    return { ...baseOf(packet), kind: 'unknown', error: String(error), payload: packet.payload };
  }
};

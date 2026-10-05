import type { CollectTracksInput, DecodeContext, ParsedPackets, ParsePacketsInput, RawPacket, ReplayPacket, TrackPoint } from './packets.types';

import { readContainer } from '../container/container';
import { ReplayFormatError } from '../errors/replay-format-error';
import { parseContainerHeader, toBytes } from '../replay/replay';
import { unpackStream } from '../stream/stream';
import { BATTLE_PERIOD, PACKET_FRAME, PACKET_TYPE } from './packets.constants';
import { decodePacket } from './packets.decoders';
import { resolveSupport } from './packets.support';

function* iterateRawPackets(stream: Uint8Array): Generator<RawPacket, number> {
  const view = new DataView(stream.buffer, stream.byteOffset, stream.byteLength);
  let offset = 0;

  while (offset + PACKET_FRAME.headerSize <= stream.byteLength) {
    const size = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const time = view.getFloat32(offset + 8, true);
    const start = offset + PACKET_FRAME.headerSize;

    if (size > PACKET_FRAME.maxPayloadSize || start + size > stream.byteLength) {
      break;
    }

    yield { offset, payload: stream.subarray(start, start + size), time, type };

    offset = start + size;

    if (type === PACKET_TYPE.endOfStream) {
      break;
    }
  }

  return offset;
}

export const parsePackets = ({ kinds: keptKinds, methodIds, replay }: ParsePacketsInput): ParsedPackets => {
  const container = readContainer(toBytes(replay));
  const { header, summary, warnings } = parseContainerHeader(container);

  if (!container.stream) {
    throw new ReplayFormatError('Replay has no packet stream');
  }

  const stream = unpackStream(container.stream);
  const support = resolveSupport({
    game: summary.game,
    methodIds,
    version: summary.clientVersion.numbers
  });

  if (header.stream && header.stream.decompressedSize !== stream.byteLength) {
    warnings.push(`Packet stream is ${stream.byteLength} bytes, header announced ${header.stream.decompressedSize}`);
  }

  const context: DecodeContext = {
    health: new Map(summary.players.flatMap((player) => (player.maxHealth === null ? [] : [[player.vehicleId, player.maxHealth]]))),
    methodIds: support.methodIds,
    vehicleIds: new Set(summary.players.map((player) => player.vehicleId))
  };

  const kinds = keptKinds ? new Set(keptKinds) : null;
  const packets: ReplayPacket[] = [];
  const counts: Record<number, number> = {};
  let battleStartTime: number | null = null;
  let endTime: number | null = null;
  let complete = false;
  const iterator = iterateRawPackets(stream);
  let step = iterator.next();

  while (!step.done) {
    const raw = step.value;
    const packet: ReplayPacket =
      support.status === 'unsupported'
        ? { kind: 'unknown', error: null, offset: raw.offset, payload: raw.payload, time: raw.time, type: raw.type }
        : decodePacket({ context, packet: raw });

    counts[raw.type] = (counts[raw.type] ?? 0) + 1;

    if (raw.type === PACKET_TYPE.endOfStream) {
      complete = true;
    } else {
      endTime = Math.max(endTime ?? 0, raw.time);
    }

    if (packet.kind === 'battlePeriod' && packet.period === BATTLE_PERIOD.battle && battleStartTime === null) {
      battleStartTime = packet.time;
    }

    if (!kinds || kinds.has(packet.kind)) {
      packets.push(packet);
    }

    step = iterator.next();
  }

  if (step.value < stream.byteLength) {
    warnings.push(`Packet stream stopped at byte ${step.value} of ${stream.byteLength}: truncated or unknown framing`);
  }

  return { battleStartTime, complete, counts, endTime, packets, summary, support, warnings };
};

export const collectTracks = ({ packets, vehicleIds }: CollectTracksInput) => {
  const tracks = new Map<number, TrackPoint[]>();

  for (const packet of packets) {
    if (packet.kind !== 'position') {
      continue;
    }

    if (vehicleIds && !vehicleIds.has(packet.entityId)) {
      continue;
    }

    const track = tracks.get(packet.entityId) ?? [];

    track.push({
      time: packet.time,
      x: packet.position.x,
      y: packet.position.y,
      z: packet.position.z,
      yaw: packet.yaw,
      pitch: packet.pitch,
      roll: packet.roll
    });

    tracks.set(packet.entityId, track);
  }

  return tracks;
};

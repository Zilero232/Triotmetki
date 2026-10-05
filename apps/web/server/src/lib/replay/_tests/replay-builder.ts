import { Blowfish } from 'egoroof-blowfish';
import { deflateSync } from 'node:zlib';

import type {
  BuildReplayInput,
  EntityMethodPayloadInput,
  HealthChangedArgsInput,
  PacketFrame,
  PeriodFrameInput,
  PositionPayloadInput
} from './replay-builder.types';

import { REPLAY_CONTAINER } from '../container/container.constants';
import { PACKET_TYPE } from '../packets/packets.constants';
import { replayCipherKey } from '../stream/stream';
import { REPLAY_CIPHER } from '../stream/stream.constants';

const encoder = new TextEncoder();
const cipher = new Blowfish(replayCipherKey(), Blowfish.MODE.ECB, Blowfish.PADDING.PKCS5);

const concat = (parts: readonly Uint8Array[]) => {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }

  return output;
};

const u32 = (value: number) => {
  const bytes = new Uint8Array(4);

  new DataView(bytes.buffer).setUint32(0, value, true);

  return bytes;
};

export const lengthPrefixed = (text: string) => {
  const bytes = encoder.encode(text);

  return concat([u32(bytes.byteLength), bytes]);
};

export const frame = ({ type, time, payload }: PacketFrame) => {
  const header = new Uint8Array(12);
  const view = new DataView(header.buffer);

  view.setUint32(0, payload.byteLength, true);
  view.setUint32(4, type, true);
  view.setFloat32(8, time, true);

  return concat([header, payload]);
};

export const positionPayload = ({ entityId, vehicleId, position, yaw }: PositionPayloadInput) => {
  const payload = new Uint8Array(45);
  const view = new DataView(payload.buffer);

  view.setInt32(0, entityId, true);
  view.setInt32(4, vehicleId, true);
  view.setFloat32(8, position.x, true);
  view.setFloat32(12, position.y, true);
  view.setFloat32(16, position.z, true);
  view.setFloat32(32, yaw, true);
  payload[44] = 1;

  return payload;
};

export const entityMethodPayload = ({ entityId, methodId, args }: EntityMethodPayloadInput) => {
  const header = new Uint8Array(12);
  const view = new DataView(header.buffer);

  view.setInt32(0, entityId, true);
  view.setUint32(4, methodId, true);
  view.setUint32(8, args.byteLength, true);

  return concat([header, args]);
};

export const healthChangedArgs = (input: HealthChangedArgsInput) => {
  const args = new Uint8Array(10);
  const view = new DataView(args.buffer);

  view.setInt16(0, input.newHealth, true);
  view.setInt16(2, input.oldHealth, true);
  view.setInt32(4, input.attackerId, true);

  return args;
};

export const encryptStream = (plain: Uint8Array) => {
  const { blockSize } = REPLAY_CIPHER;
  const padded = new Uint8Array(Math.ceil(plain.byteLength / blockSize) * blockSize);

  padded.set(plain);

  const chained = new Uint8Array(padded);

  for (let index = blockSize; index < padded.byteLength; index += 1) {
    chained[index] = padded[index]! ^ padded[index - blockSize]!;
  }

  return cipher.encode(chained).subarray(0, padded.byteLength);
};

export const endOfStream = () => frame({ type: PACKET_TYPE.endOfStream, time: 0, payload: new Uint8Array(0) });

export const buildReplay = ({ blocks, packets }: BuildReplayInput) => {
  const blockBytes = blocks.map((block) => {
    const bytes = encoder.encode(typeof block === 'string' ? block : JSON.stringify(block));

    return concat([u32(bytes.byteLength), bytes]);
  });

  const head = concat([u32(REPLAY_CONTAINER.magic), u32(blocks.length), ...blockBytes]);

  if (!packets) {
    return head;
  }

  const plain = concat(packets);
  const compressed = new Uint8Array(deflateSync(plain));

  return concat([head, u32(plain.byteLength), u32(compressed.byteLength), encryptStream(compressed)]);
};

export const periodFrame = ({ period, time }: PeriodFrameInput) => {
  const payload = new Uint8Array(4);

  new DataView(payload.buffer).setUint32(0, period, true);

  return frame({ type: PACKET_TYPE.battlePeriod, time, payload });
};

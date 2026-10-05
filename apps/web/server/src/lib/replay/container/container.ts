import type { ReplayContainer, ReplayStreamSection } from './container.types';

import { ByteReader } from '../binary/byte-reader';
import { ReplayFormatError } from '../errors/replay-format-error';
import { REPLAY_CONTAINER } from './container.constants';

const readStreamSection = (reader: ByteReader): ReplayStreamSection | null => {
  if (reader.remaining < REPLAY_CONTAINER.streamHeaderSize) {
    return null;
  }

  const decompressedSize = reader.u32();
  const compressedSize = reader.u32();
  const data = reader.rest();

  if (data.byteLength === 0) {
    return null;
  }

  return { compressedSize, data, decompressedSize };
};

export const readContainer = (bytes: Uint8Array): ReplayContainer => {
  const reader = new ByteReader(bytes);

  if (reader.remaining < 8) {
    throw new ReplayFormatError(`File is too short to be a replay (${bytes.byteLength} bytes)`);
  }

  const magic = reader.u32();

  if (magic !== REPLAY_CONTAINER.magic) {
    throw new ReplayFormatError(`Bad replay magic 0x${magic.toString(16)}, expected 0x${REPLAY_CONTAINER.magic.toString(16)}`);
  }

  const blockCount = reader.u32();

  if (blockCount === 0 || blockCount > REPLAY_CONTAINER.maxBlocks) {
    throw new ReplayFormatError(`Implausible JSON block count ${blockCount}`);
  }

  const blocks: Uint8Array[] = [];
  let headerBytes = 0;

  for (let index = 0; index < blockCount; index += 1) {
    if (reader.remaining < 4) {
      throw new ReplayFormatError(`Replay ends inside the size of JSON block #${index}`);
    }

    const size = reader.u32();

    if (size > reader.remaining) {
      throw new ReplayFormatError(`JSON block #${index} (${size} bytes) does not fit in the file`);
    }

    headerBytes += size;

    if (headerBytes > REPLAY_CONTAINER.maxHeaderBytes) {
      throw new ReplayFormatError(`JSON blocks exceed ${REPLAY_CONTAINER.maxHeaderBytes} bytes`);
    }

    blocks.push(reader.take(size));
  }

  return { blocks, magic, stream: readStreamSection(reader) };
};

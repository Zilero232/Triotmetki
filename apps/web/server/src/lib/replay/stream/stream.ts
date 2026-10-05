import { Blowfish } from 'egoroof-blowfish';
import { inflateSync } from 'node:zlib';

import type { ReplayStreamSection } from '../container/container.types';

import { ReplayFormatError } from '../errors/replay-format-error';
import { REPLAY_CIPHER } from './stream.constants';

export const replayCipherKey = () => Uint8Array.from(Buffer.from(REPLAY_CIPHER.keyHex, 'hex'));

const cipher = new Blowfish(replayCipherKey(), Blowfish.MODE.ECB, Blowfish.PADDING.PKCS5);
const paddingBlock = cipher.encode(new Uint8Array(0));

export const decryptStream = (data: Uint8Array) => {
  const { blockSize } = REPLAY_CIPHER;
  const alignedLength = Math.ceil(data.byteLength / blockSize) * blockSize;
  const input = new Uint8Array(alignedLength + blockSize);

  input.set(data);
  input.set(paddingBlock, alignedLength);

  const plain = cipher.decode(input, Blowfish.TYPE.UINT8_ARRAY);

  for (let index = blockSize; index < plain.byteLength; index += 1) {
    plain[index] ^= plain[index - blockSize];
  }

  return plain;
};

export const unpackStream = (section: ReplayStreamSection) => {
  const plain = decryptStream(section.data);
  const compressed = section.compressedSize > 0 && section.compressedSize <= plain.byteLength ? plain.subarray(0, section.compressedSize) : plain;

  try {
    const inflated = inflateSync(compressed, { maxOutputLength: REPLAY_CIPHER.maxInflatedBytes });

    return new Uint8Array(inflated.buffer, inflated.byteOffset, inflated.byteLength);
  } catch (error) {
    throw new ReplayFormatError(`Packet stream failed to decrypt or inflate: ${String(error)}`);
  }
};

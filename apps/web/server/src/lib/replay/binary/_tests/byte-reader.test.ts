import { describe, expect, it } from 'vitest';

import { ReplayFormatError } from '../../errors/replay-format-error';
import { ByteReader } from '../byte-reader';

const bytesOf = ({ size, write }: { size: number; write: (view: DataView) => void }) => {
  const buffer = new ArrayBuffer(size);

  write(new DataView(buffer));

  return new Uint8Array(buffer);
};

describe('ByteReader', () => {
  it('reads little-endian integers and floats in order', () => {
    const reader = new ByteReader(
      bytesOf({
        size: 11,
        write: (view) => {
          view.setUint8(0, 200);
          view.setInt16(1, -2, true);
          view.setUint32(3, 70_000, true);
          view.setFloat32(7, 1.5, true);
        }
      })
    );

    expect(reader.u8()).toBe(200);
    expect(reader.i16()).toBe(-2);
    expect(reader.u32()).toBe(70_000);
    expect(reader.f32()).toBe(1.5);
    expect(reader.remaining).toBe(0);
  });

  it('decodes the short and the extended packed length', () => {
    expect(new ByteReader(Uint8Array.of(12)).packedLength()).toBe(12);
    expect(new ByteReader(Uint8Array.of(255, 0x34, 0x12, 0x01)).packedLength()).toBe(0x1_12_34);
  });

  it('respects a view that starts inside a larger buffer', () => {
    const backing = Uint8Array.of(9, 9, 7, 0);
    const reader = new ByteReader(backing.subarray(2));

    expect(reader.u16()).toBe(7);
  });

  it('throws a format error instead of reading past the end', () => {
    const reader = new ByteReader(Uint8Array.of(1, 2));

    expect(() => reader.u32()).toThrow(ReplayFormatError);
    expect(reader.offset).toBe(0);
    expect(reader.take(2)).toEqual(Uint8Array.of(1, 2));
    expect(reader.rest()).toHaveLength(0);
  });
});

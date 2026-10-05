import type { Vector3 } from './byte-reader.types';

import { ReplayFormatError } from '../errors/replay-format-error';

export class ByteReader {
  offset = 0;
  private readonly bytes: Uint8Array;
  private readonly view: DataView;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get length() {
    return this.bytes.byteLength;
  }

  get remaining() {
    return this.bytes.byteLength - this.offset;
  }

  u8() {
    return this.view.getUint8(this.claim(1));
  }

  i8() {
    return this.view.getInt8(this.claim(1));
  }

  u16() {
    return this.view.getUint16(this.claim(2), true);
  }

  i16() {
    return this.view.getInt16(this.claim(2), true);
  }

  u32() {
    return this.view.getUint32(this.claim(4), true);
  }

  i32() {
    return this.view.getInt32(this.claim(4), true);
  }

  f32() {
    return this.view.getFloat32(this.claim(4), true);
  }

  vector3(): Vector3 {
    return { x: this.f32(), y: this.f32(), z: this.f32() };
  }

  take(size: number) {
    const start = this.claim(size);

    return this.bytes.subarray(start, start + size);
  }

  rest() {
    return this.take(this.remaining);
  }

  packedLength() {
    const first = this.u8();

    if (first !== 255) {
      return first;
    }

    return this.u16() + this.u8() * 0x10000;
  }

  private claim(size: number) {
    if (size < 0 || this.offset + size > this.bytes.byteLength) {
      throw new ReplayFormatError(`Unexpected end of data: need ${size} byte(s) at offset ${this.offset}, have ${this.remaining}`);
    }

    const start = this.offset;

    this.offset += size;

    return start;
  }
}

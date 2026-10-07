from __future__ import absolute_import, division, print_function, unicode_literals

import struct
import zlib

from ....core.vendor import attr
from .constants import (
    BITS_PER_BYTE,
    BMP_BITFIELDS,
    BMP_BITS,
    BMP_BITS_AT,
    BMP_COMPRESSION_AT,
    BMP_HEADER_END,
    BMP_MAGIC,
    BMP_MASKS,
    BMP_MASKS_AT,
    BMP_MASKS_FORMAT,
    BMP_MASKS_SIZE,
    BMP_PIXELS_OFFSET_AT,
    BMP_RGB,
    BMP_SIZE_AT,
    BMP_SIZE_FORMAT,
    BMP_UINT16,
    BMP_UINT32,
    BYTE_MASK,
    CRC_MASK,
    PNG_COMPRESSION,
    PNG_DEPTH,
    PNG_FILTER_SUB,
    PNG_HEADER_FORMAT,
    PNG_RGB,
    PNG_SIGNATURE,
    PNG_UINT32,
    PREVIEW_TAPS,
    RGB_CHANNELS,
    ROW_ALIGN_BITS,
    ROW_ALIGN_BYTES,
)

# The client embeds no image library (no PIL): the bitmap is re-encoded with the standard library.


class ThumbnailError(ValueError):
    pass


@attr.s(frozen=True)
class Bitmap(object):

    data = attr.ib()
    width = attr.ib()
    height = attr.ib()
    pixel_bytes = attr.ib()
    stride = attr.ib()
    offset = attr.ib()
    top_down = attr.ib()

    def row_start(self, row):
        stored = row if self.top_down else self.height - 1 - row
        return self.offset + stored * self.stride


def _unpack(struct_format, data, position):
    return struct.unpack_from(str(struct_format), data, position)


def _unpack_one(struct_format, data, position):
    return _unpack(struct_format, data, position)[0]


def _check_masks(data):
    if len(data) < BMP_MASKS_AT + BMP_MASKS_SIZE or _unpack(BMP_MASKS_FORMAT, data, BMP_MASKS_AT) != BMP_MASKS:
        raise ThumbnailError('bmp_masks')


def _row_stride(width, bits):
    words = (width * bits + ROW_ALIGN_BITS - 1) // ROW_ALIGN_BITS
    return words * ROW_ALIGN_BYTES


def read_bitmap(raw):
    data = bytearray(raw)
    if len(data) < BMP_HEADER_END or bytes(data[:len(BMP_MAGIC)]) != BMP_MAGIC:
        raise ThumbnailError('not_bmp')

    offset = _unpack_one(BMP_UINT32, data, BMP_PIXELS_OFFSET_AT)
    width, height = _unpack(BMP_SIZE_FORMAT, data, BMP_SIZE_AT)
    bits = _unpack_one(BMP_UINT16, data, BMP_BITS_AT)
    compression = _unpack_one(BMP_UINT32, data, BMP_COMPRESSION_AT)
    if bits not in BMP_BITS or compression not in (BMP_RGB, BMP_BITFIELDS) or width <= 0 or height == 0:
        raise ThumbnailError('bmp_format')
    if compression == BMP_BITFIELDS:
        _check_masks(data)

    stride = _row_stride(width, bits)
    if offset + stride * abs(height) > len(data):
        raise ThumbnailError('bmp_short')
    return Bitmap(data, width, abs(height), bits // BITS_PER_BYTE, stride, offset, height < 0)


def crop_box(width, height, size):
    wanted_width, wanted_height = size
    if width * wanted_height > height * wanted_width:
        cropped = height * wanted_width // wanted_height
        return (width - cropped) // 2, 0, cropped, height
    cropped = width * wanted_height // wanted_width
    return 0, (height - cropped) // 2, width, cropped


def _samples(start, length, count, tap):
    return [start + min(int((index + tap) * length / count), length - 1) for index in range(count)]


def _row(data, starts, columns):
    row_bytes = bytearray(len(columns[0]) * RGB_CHANNELS)
    taps = len(starts) * len(columns)
    position = 0
    for offsets in zip(*columns):
        blue = green = red = 0
        for start in starts:
            for offset in offsets:
                pixel = start + offset
                blue += data[pixel]
                green += data[pixel + 1]
                red += data[pixel + 2]
        row_bytes[position] = red // taps
        row_bytes[position + 1] = green // taps
        row_bytes[position + 2] = blue // taps
        position += RGB_CHANNELS
    return row_bytes


def _column_offsets(bitmap, left, cropped_width, width, tap):
    return [column * bitmap.pixel_bytes for column in _samples(left, cropped_width, width, tap)]


def _row_starts(bitmap, rows, index):
    return [bitmap.row_start(taps[index]) for taps in rows]


def thumbnail_rows(bitmap, size):
    width, height = size
    left, top, cropped_width, cropped_height = crop_box(bitmap.width, bitmap.height, size)
    columns = [_column_offsets(bitmap, left, cropped_width, width, tap) for tap in PREVIEW_TAPS]
    rows = [_samples(top, cropped_height, height, tap) for tap in PREVIEW_TAPS]
    return [_row(bitmap.data, _row_starts(bitmap, rows, index), columns) for index in range(height)]


def _sub_filtered(row):
    filtered = bytearray(len(row) + 1)
    filtered[0] = PNG_FILTER_SUB
    for index, value in enumerate(row):
        left = row[index - RGB_CHANNELS] if index >= RGB_CHANNELS else 0
        filtered[index + 1] = (value - left) & BYTE_MASK
    return filtered


def _chunk(kind, body):
    checksum = zlib.crc32(kind + body) & CRC_MASK
    length = struct.pack(str(PNG_UINT32), len(body))
    return length + kind + body + struct.pack(str(PNG_UINT32), checksum)


def encode_png(width, rows):
    stream = bytearray()
    for row in rows:
        stream.extend(_sub_filtered(row))
    header = struct.pack(str(PNG_HEADER_FORMAT), width, len(rows), PNG_DEPTH, PNG_RGB, 0, 0, 0)
    compressed = zlib.compress(bytes(stream), PNG_COMPRESSION)
    chunks = (PNG_SIGNATURE, _chunk(b'IHDR', header), _chunk(b'IDAT', compressed), _chunk(b'IEND', b''))
    return b''.join(chunks)


def bitmap_thumbnail(raw, size):
    return encode_png(size[0], thumbnail_rows(read_bitmap(raw), size))

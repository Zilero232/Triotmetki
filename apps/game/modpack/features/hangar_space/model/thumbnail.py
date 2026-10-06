from __future__ import absolute_import, division, print_function, unicode_literals

import struct
import zlib

from ....core.vendor import attr
from .constants import (
    BMP_BITFIELDS,
    BMP_BITS,
    BMP_BITS_AT,
    BMP_COMPRESSION_AT,
    BMP_HEADER_END,
    BMP_MAGIC,
    BMP_MASKS,
    BMP_MASKS_AT,
    BMP_PIXELS_OFFSET_AT,
    BMP_RGB,
    BMP_SIZE_AT,
    PNG_COMPRESSION,
    PNG_DEPTH,
    PNG_FILTER_SUB,
    PNG_RGB,
    PNG_SIGNATURE,
    PREVIEW_TAPS,
    RGB_CHANNELS,
)

# The client embeds no image library (no PIL), so the capture is read as an uncompressed bitmap and written back as
# a small PNG with the standard library alone: struct for the headers, zlib for the PNG stream.


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


def _unpack(fmt, data, position):
    return struct.unpack_from(str(fmt), data, position)


def _check_masks(data):
    if len(data) < BMP_MASKS_AT + 12 or _unpack('<III', data, BMP_MASKS_AT) != BMP_MASKS:
        raise ThumbnailError('bmp_masks')


def read_bitmap(raw):
    data = bytearray(raw)
    if len(data) < BMP_HEADER_END or bytes(data[:2]) != BMP_MAGIC:
        raise ThumbnailError('not_bmp')

    offset = _unpack('<I', data, BMP_PIXELS_OFFSET_AT)[0]
    width, height = _unpack('<ii', data, BMP_SIZE_AT)
    bits = _unpack('<H', data, BMP_BITS_AT)[0]
    compression = _unpack('<I', data, BMP_COMPRESSION_AT)[0]
    if bits not in BMP_BITS or compression not in (BMP_RGB, BMP_BITFIELDS) or width <= 0 or height == 0:
        raise ThumbnailError('bmp_format')
    if compression == BMP_BITFIELDS:
        _check_masks(data)

    stride = (width * bits + 31) // 32 * 4
    if offset + stride * abs(height) > len(data):
        raise ThumbnailError('bmp_short')
    return Bitmap(data, width, abs(height), bits // 8, stride, offset, height < 0)


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
    out = bytearray(len(columns[0]) * RGB_CHANNELS)
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
        out[position] = red // taps
        out[position + 1] = green // taps
        out[position + 2] = blue // taps
        position += RGB_CHANNELS
    return out


def thumbnail_rows(bitmap, size):
    width, height = size
    left, top, cropped_width, cropped_height = crop_box(bitmap.width, bitmap.height, size)
    columns = [[column * bitmap.pixel_bytes for column in _samples(left, cropped_width, width, tap)]
               for tap in PREVIEW_TAPS]
    rows = [_samples(top, cropped_height, height, tap) for tap in PREVIEW_TAPS]
    return [_row(bitmap.data, [bitmap.row_start(taps[index]) for taps in rows], columns) for index in range(height)]


def _sub_filtered(row):
    out = bytearray(len(row) + 1)
    out[0] = PNG_FILTER_SUB
    for index, value in enumerate(row):
        left = row[index - RGB_CHANNELS] if index >= RGB_CHANNELS else 0
        out[index + 1] = (value - left) & 0xFF
    return out


def _chunk(kind, body):
    checksum = zlib.crc32(kind + body) & 0xFFFFFFFF
    return struct.pack(str('>I'), len(body)) + kind + body + struct.pack(str('>I'), checksum)


def encode_png(width, rows):
    stream = bytearray()
    for row in rows:
        stream.extend(_sub_filtered(row))
    header = struct.pack(str('>IIBBBBB'), width, len(rows), PNG_DEPTH, PNG_RGB, 0, 0, 0)
    return b''.join((PNG_SIGNATURE, _chunk(b'IHDR', header),
                     _chunk(b'IDAT', zlib.compress(bytes(stream), PNG_COMPRESSION)), _chunk(b'IEND', b'')))


def bitmap_thumbnail(raw, size):
    return encode_png(size[0], thumbnail_rows(read_bitmap(raw), size))

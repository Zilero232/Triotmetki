"""Writes the colour-grading tables of the hangar looks (assets/otmetki/hangar_looks).

Each grade in `src/grades.json` (our own colour grading, original art) becomes `dds/<id>.dds`: the layout of the RU
1.45 client's own tables in `system/maps/post_processing/cube/` (lut_default.dds in shared_content-part2.pkg): an
uncompressed DDS, 256 x 16 pixels, BGRA 8 bits per channel, no mipmaps, 16 512 bytes. The 16 x 16 x 16 colour cube is
unwrapped into 16 slices side by side: pixel (x, y) holds the graded colour of red = x mod 16, green = y,
blue = x div 16 (in steps of 1/15). An environment names one in `HDR/colorCorrection/map`.

    python tools/assets/lut.py           # rewrite every table
    python tools/assets/lut.py --check   # fail when a table is missing or differs from its grade
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import struct
import sys

MODPACK_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOOKS_DIR = os.path.join(MODPACK_DIR, 'assets', 'otmetki', 'hangar_looks')
GRADES = os.path.join(LOOKS_DIR, 'src', 'grades.json')
OUTPUT_DIR = os.path.join(LOOKS_DIR, 'dds')

SIZE = 16
WIDTH = SIZE * SIZE
HEIGHT = SIZE
LEVELS = SIZE - 1
LUMA = (0.2126, 0.7152, 0.0722)
MID_GREY = 0.5
# DDS_HEADER of lut_default.dds: CAPS | HEIGHT | WIDTH | PIXELFORMAT | LINEARSIZE, a plain texture (DDSCAPS_TEXTURE),
# pixel format RGB | ALPHAPIXELS with 32 bits and the masks of BGRA byte order.
DDS = {
    'magic': b'DDS ',
    'header_size': 124,
    'flags': 0x81007,
    'pixel_format_size': 32,
    'pixel_format_flags': 0x41,
    'bit_count': 32,
    'masks': (0x00FF0000, 0x0000FF00, 0x000000FF, 0xFF000000),
    'caps': 0x1000,
}
HEADER_FORMAT = '<4s7I44x8I5I'


def header():
    sizes = (DDS['header_size'], DDS['flags'], HEIGHT, WIDTH, WIDTH * HEIGHT * 4, 0, 0)
    pixel_format = (DDS['pixel_format_size'], DDS['pixel_format_flags'], 0, DDS['bit_count']) + DDS['masks']
    caps = (DDS['caps'], 0, 0, 0, 0)
    return struct.pack(HEADER_FORMAT, DDS['magic'], *(sizes + pixel_format + caps))


def clamp(value):
    return min(1.0, max(0.0, value))


def luma(colour):
    return sum(weight * channel for weight, channel in zip(LUMA, colour))


def balance(colour, grade):
    tinted = [channel * white for channel, white in zip(colour, grade['white_balance'])]
    lifted = [max(0.0, channel * gain + lift) for channel, gain, lift in zip(tinted, grade['gain'], grade['lift'])]
    return [channel ** gamma for channel, gamma in zip(lifted, grade['gamma'])]


def tone(colour, grade):
    weight = luma(colour)
    saturated = [weight + (channel - weight) * grade['saturation'] for channel in colour]
    toned = [
        channel + shadow * (1.0 - weight) + highlight * weight
        for channel, shadow, highlight in zip(saturated, grade['shadows'], grade['highlights'])
    ]
    return [MID_GREY + (channel - MID_GREY) * grade['contrast'] for channel in toned]


def graded(colour, grade):
    return [clamp(channel) for channel in tone(balance(colour, grade), grade)]


def to_byte(value):
    return int(round(round(value, 6) * 255))


def pixels(grade):
    rows = []
    for green in range(SIZE):
        for x in range(WIDTH):
            red, blue = x % SIZE, x // SIZE
            colour = graded([red / LEVELS, green / LEVELS, blue / LEVELS], grade)
            red_byte, green_byte, blue_byte = [to_byte(channel) for channel in colour]
            rows.append(struct.pack('4B', blue_byte, green_byte, red_byte, 255))
    return b''.join(rows)


def table(grade):
    return header() + pixels(grade)


def load_grades(path=GRADES):
    with io.open(path, encoding='utf-8') as handle:
        return json.load(handle)['grades']


def output_path(look_id):
    return os.path.join(OUTPUT_DIR, '%s.dds' % look_id)


def read(path):
    if not os.path.isfile(path):
        return None
    with open(path, 'rb') as handle:
        return handle.read()


def write(path, data):
    if not os.path.isdir(os.path.dirname(path)):
        os.makedirs(os.path.dirname(path))
    with open(path, 'wb') as handle:
        handle.write(data)


def main(argv):
    is_check = '--check' in argv
    stale = []
    for look_id, grade in sorted(load_grades().items()):
        data = table(grade)
        path = output_path(look_id)
        if not is_check:
            write(path, data)
        elif read(path) != data:
            stale.append(path)
    if stale:
        sys.stderr.write('stale colour tables (run tools/assets/lut.py):\n  %s\n' % '\n  '.join(stale))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

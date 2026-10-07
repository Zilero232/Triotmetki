"""Catalog previews from real in-game screenshots (catalog/previews/CAPTURE.md).

    python tools/build/previews/capture --prepare     # the dev install's capture.json: the ids to shoot, in order
    python tools/build/previews/capture [ID ...]      # screenshots -> catalog/previews/<id>.png + catalog.json

The dev install's preview capture (packages/companion/capture) saves `screenshots/otmetki_<id>_NNN.png` in the client
folder (Ctrl+Shift+F12, Ctrl+Shift+F11 picks the next id). This package holds the pure part of the host tool: the crop
boxes of catalog/previews/capture.json, the shot names, the 16:9 box around a crop and the catalog.json switch; the
images are cropped, scaled and packed with Pillow in __main__.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import collections
import re

ASPECT = (16, 9)
ID_PATTERN = re.compile(r'^[a-z][a-z0-9_]*$')
# The client appends _NNN to the name it is given (RU 1.45 engine_config.xml screenShot: screenshots/shot_001.jpg).
SHOT_PATTERN = re.compile(r'^otmetki_(?P<id>[a-z][a-z0-9_]*?)(?:_(?P<number>\d+))?\.(?:png|jpg|jpeg|bmp|tga)$', re.I)
COMPONENTS_KEY = '"components"'
ID_KEY = re.compile(r'"id"\s*:\s*"([^"]+)"')
IMAGE_KEY = re.compile(r'("image"\s*:\s*")([^"]+)(")')

Crop = collections.namedtuple('Crop', 'component_id box')


class CaptureError(ValueError):
    pass


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _screen(data):
    screen = data.get('screen')
    if not (isinstance(screen, list) and len(screen) == 2 and all(_is_number(side) and side > 0 for side in screen)):
        raise CaptureError('capture.json: "screen" must be [width, height] in pixels')
    return tuple(screen)


def _box(component_id, raw, screen):
    if raw is None:
        return None
    if not (isinstance(raw, list) and len(raw) == 4 and all(_is_number(value) for value in raw)):
        raise CaptureError('capture.json: %s "box" must be [left, top, width, height] or null' % component_id)
    left, top, width, height = raw
    inside = left >= 0 and top >= 0 and left + width <= screen[0] and top + height <= screen[1]
    if width <= 0 or height <= 0 or not inside:
        raise CaptureError('capture.json: %s "box" %s is not inside the %dx%d screen' % ((component_id, raw) + screen))
    return tuple(raw)


def parse_crops(data):
    """(screen size, {id: Crop} in the file's order) of capture.json; a null box is the whole screen."""
    if not isinstance(data, dict) or not isinstance(data.get('crops'), dict):
        raise CaptureError('capture.json: expected {"screen": [w, h], "crops": {"<id>": {"box": [...]}}}')
    screen = _screen(data)
    crops = collections.OrderedDict()
    for component_id, entry in data['crops'].items():
        if not ID_PATTERN.match(component_id) or not isinstance(entry, dict):
            raise CaptureError('capture.json: %r is not a component id with an object' % component_id)
        crops[component_id] = Crop(component_id, _box(component_id, entry.get('box'), screen))
    return screen, crops


def shot_id(name):
    """(component id, shot number) of a capture screenshot's file name, None for any other file."""
    match = SHOT_PATTERN.match(name)
    if match is None:
        return None
    return match.group('id'), int(match.group('number') or 0)


def latest_shots(names):
    """{component id: the file name of its newest shot}: the client numbers the shots upwards."""
    latest = {}
    for name in names:
        found = shot_id(name)
        if found is None:
            continue
        component_id, number = found
        if component_id not in latest or number >= latest[component_id][0]:
            latest[component_id] = (number, name)
    return {component_id: name for component_id, (_, name) in latest.items()}


def scaled_box(box, screen, size):
    """`box` on the reference `screen` in the pixels of an image of `size` (another resolution)."""
    if box is None:
        return 0, 0, size[0], size[1]
    scale_x = float(size[0]) / screen[0]
    scale_y = float(size[1]) / screen[1]
    left, top, width, height = box
    return left * scale_x, top * scale_y, width * scale_x, height * scale_y


def _span(start, length, limit):
    start = min(max(start, 0), limit - length)
    return int(round(start)), int(round(start + length))


def fit_box(box, size):
    """(left, top, right, bottom) of the 16:9 area around `box` ([left, top, width, height] in pixels): the box grows
    on its short side around its centre, then moves inside the image; an image too small for it gives its largest
    16:9 area around the box's centre."""
    left, top, width, height = box
    centre_x, centre_y = left + width / 2.0, top + height / 2.0
    if width * ASPECT[1] < height * ASPECT[0]:
        width = height * ASPECT[0] / float(ASPECT[1])
    else:
        height = width * ASPECT[1] / float(ASPECT[0])
    scale = min(1.0, float(size[0]) / width, float(size[1]) / height)
    width, height = width * scale, height * scale
    horizontal = _span(centre_x - width / 2.0, width, size[0])
    vertical = _span(centre_y - height / 2.0, height, size[1])
    return horizontal[0], vertical[0], horizontal[1], vertical[1]


def preview_image(component_id):
    return 'previews/%s.png' % component_id


def _entry_span(text, component_id):
    start = text.find(COMPONENTS_KEY)
    if start < 0:
        raise CaptureError('catalog.json has no "components" list')
    ids = list(ID_KEY.finditer(text, start))
    for index, match in enumerate(ids):
        if match.group(1) == component_id:
            end = ids[index + 1].start() if index + 1 < len(ids) else len(text)
            return match.end(), end
    raise CaptureError('catalog.json has no component %s' % component_id)


def switch_preview(text, component_id, image):
    """(catalog.json text with the component's preview image set to `image`, the image it had). Only that string
    changes, so the file keeps its formatting."""
    start, end = _entry_span(text, component_id)
    match = IMAGE_KEY.search(text, start, end)
    if match is None:
        raise CaptureError('catalog.json: component %s has no preview image' % component_id)
    replaced = text[:match.start(2)] + image + text[match.end(2):]
    return replaced, match.group(2)


def image_users(text, image):
    """How many entries of catalog.json show `image`."""
    return sum(1 for match in IMAGE_KEY.finditer(text) if match.group(2) == image)


def capture_ids(crops, hud_previews):
    """The ids the dev install shoots, in the crop file's order, without those the HUD page draws."""
    return [component_id for component_id in crops if component_id not in hud_previews]

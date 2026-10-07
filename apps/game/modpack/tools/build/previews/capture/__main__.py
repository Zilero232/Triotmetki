"""Turn the dev install's screenshots into catalog previews (catalog/previews/CAPTURE.md).

Usage:
    python tools/build/previews/capture --prepare            # write <client>/mods/configs/otmetki/capture.json
    python tools/build/previews/capture [ID ...]             # newest shot of each id -> catalog/previews/<id>.png
    python tools/build/previews/capture --list               # which ids have a shot, which still need one
    python tools/build/previews/capture --shots DIR [--dry-run] [--colours 0]

The shots are `otmetki_<id>_NNN.png` in the client's screenshots folder (the client the dev loop detects, or --shots).
Each is cropped to its box in catalog/previews/capture.json grown to 16:9, scaled to the preview size, packed to a
256-colour PNG, written over catalog/previews/<id>.png, and the catalog entry's preview switches to it; the drawn SVG
it replaces is removed when no other entry shows it.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import argparse
import collections
import io
import json
import os
import sys

CAPTURE_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.dirname(os.path.dirname(CAPTURE_DIR))
TOOLS_DIR = os.path.dirname(BUILD_DIR)
for path in (BUILD_DIR, TOOLS_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

import fileio  # noqa: E402
from previews.capture import (  # noqa: E402
    CaptureError,
    capture_ids,
    fit_box,
    image_users,
    latest_shots,
    parse_crops,
    preview_image,
    scaled_box,
    switch_preview,
)
from previews.states import HUD_PREVIEWS, MODPACK_DIR  # noqa: E402

CATALOG_DIR = os.path.join(MODPACK_DIR, 'catalog')
CATALOG_PATH = os.path.join(CATALOG_DIR, 'catalog.json')
DEFAULT_CROPS = os.path.join(CATALOG_DIR, 'previews', 'capture.json')
# The preview canvas of setupkit.artwork (640x360, the manager's 16:9 card).
PREVIEW_SIZE = (640, 360)
PALETTE_COLOURS = 256
SHOTS_FOLDER = 'screenshots'
GAME_CONFIG = os.path.join('mods', 'configs', 'otmetki', 'capture.json')


def parse_args(argv=None):
    parser = argparse.ArgumentParser(prog='tools/build/previews/capture', description=__doc__.split('\n')[0])
    parser.add_argument('ids', nargs='*', help='component ids (default: every id with a shot)')
    parser.add_argument('--shots', help='screenshots folder (default: <detected client>/screenshots)')
    parser.add_argument('--crops', default=DEFAULT_CROPS, help='crop boxes (catalog/previews/capture.json)')
    parser.add_argument('--colours', type=int, default=PALETTE_COLOURS, help='PNG palette size, 0 keeps full colour')
    parser.add_argument('--dry-run', action='store_true', help='print what would be written, write nothing')
    parser.add_argument('--list', action='store_true', help='list the ids with and without a shot')
    parser.add_argument('--prepare', action='store_true', help='write the dev install\'s capture.json')
    return parser.parse_args(argv)


def client_dir():
    from dev import text_environ
    from dev.client import ClientError, find_client

    try:
        return find_client(text_environ(os.environ)).path
    except ClientError as error:
        raise CaptureError('%s (or pass --shots)' % error)


def read_crops(path):
    with io.open(path, encoding='utf-8') as handle:
        data = json.load(handle, object_pairs_hook=collections.OrderedDict)
    return parse_crops(data)


def prepare(crops):
    path = os.path.join(client_dir(), GAME_CONFIG)
    ids = capture_ids(crops, HUD_PREVIEWS)
    if not ids:
        raise CaptureError('capture.json lists no component to shoot')
    fileio.write_json(path, {'ids': ids, 'current': ids[0]})
    print('wrote %s: %d ids, the first is %s' % (path, len(ids), ids[0]))


def render(source, box, screen, colours):
    """The preview image of one screenshot: its crop grown to 16:9, scaled to PREVIEW_SIZE, packed to `colours`."""
    from PIL import Image

    image = Image.open(source).convert('RGB')
    area = fit_box(scaled_box(box, screen, image.size), image.size)
    image = image.crop(area).resize(PREVIEW_SIZE, Image.LANCZOS)
    if colours:
        image = image.quantize(colors=colours, method=Image.MEDIANCUT)
    return image


def switch_catalog(component_id, dry_run):
    """Points the catalog entry at <id>.png; returns the old preview file when no entry shows it any more."""
    with io.open(CATALOG_PATH, encoding='utf-8') as handle:
        text = handle.read()
    image = preview_image(component_id)
    text, old = switch_preview(text, component_id, image)
    if not dry_run:
        fileio.write_text(CATALOG_PATH, text)
    if old == image or image_users(text, old):
        return None
    return os.path.join(CATALOG_DIR, *old.split('/'))


def chosen(ids, crops, shots):
    unknown = [component_id for component_id in ids if component_id not in crops]
    drawn = [component_id for component_id in ids if component_id in HUD_PREVIEWS]
    if unknown:
        raise CaptureError('no crop box in capture.json for %s' % ', '.join(unknown))
    if drawn:
        raise CaptureError('%s: the HUD page draws these previews (tools/build/previews)' % ', '.join(drawn))
    return ids or [component_id for component_id in capture_ids(crops, HUD_PREVIEWS) if component_id in shots]


def capture(args, screen, crops):
    shots_dir = args.shots or os.path.join(client_dir(), SHOTS_FOLDER)
    shots = latest_shots(os.listdir(shots_dir)) if os.path.isdir(shots_dir) else {}
    if args.list:
        for component_id in capture_ids(crops, HUD_PREVIEWS):
            print('%-22s %s' % (component_id, shots.get(component_id, '-')))
        return
    for component_id in chosen(args.ids, crops, shots):
        if component_id not in shots:
            raise CaptureError('no shot of %s in %s (otmetki_%s_NNN.png)' % (component_id, shots_dir, component_id))
        source = os.path.join(shots_dir, shots[component_id])
        out = os.path.join(CATALOG_DIR, *preview_image(component_id).split('/'))
        image = render(source, crops[component_id].box, screen, args.colours)
        stale = switch_catalog(component_id, args.dry_run)
        if not args.dry_run:
            image.save(out, format='PNG', optimize=True)
            if stale and os.path.isfile(stale):
                os.remove(stale)
        size = '' if args.dry_run else ' (%d KB)' % (os.path.getsize(out) // 1024)
        print('%s: %s -> %s%s' % (component_id, shots[component_id], os.path.relpath(out, MODPACK_DIR), size))


def main(argv=None):
    args = parse_args(argv)
    try:
        screen, crops = read_crops(args.crops)
        if args.prepare:
            prepare(crops)
        else:
            capture(args, screen, crops)
    except (CaptureError, IOError, OSError) as error:
        sys.stderr.write('capture: %s\n' % error)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())

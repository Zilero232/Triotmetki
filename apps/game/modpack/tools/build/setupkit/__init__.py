"""setupkit: the component catalogue the modpack manager (apps/game/manager) reads.

    manifest/  catalog/catalog.json + tools/build/layout.py -> components.json
    artwork/   the catalog's preview SVGs -> 16:9 PNG previews next to components.json
    audio/     the catalog's audio previews (sounds the components ship) -> previews/<id>.<ext>

Run it as `python tools/build/setupkit --help` (see __main__.py).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODPACK_DIR = os.path.dirname(os.path.dirname(BUILD_DIR))
CATALOG_DIR = os.path.join(MODPACK_DIR, 'catalog')
CATALOG_PATH = os.path.join(CATALOG_DIR, 'catalog.json')
ASSETS_DIR = CATALOG_DIR
SCHEMA_PATH = os.path.join(CATALOG_DIR, 'catalog.schema.json')

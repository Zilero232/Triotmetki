"""dev: the local dev loop — build the packages and install them into the local game client without a release.

    client/      finds the game client the way the manager does (OTMETKI_GAME_DIR first, then Lesta Game Center)
    manager/     sees a modpack install the manager made in that client (its manifest, our packages in mods/<version>)
    selection/   component ids -> our package keys + the third-party runtime mods they need (catalog/catalog.json)
    thirdparty/  OpenWG Gameface and GUIFlash from their pinned sourceUrl, checked by sha256, cached under dist/dev
    builder/     builds the chosen packages with tools/build (bytecode when a compiler is found, sources otherwise)
    deploy/      writes them into mods/<version>/otmetki-dev/ with a manifest; uninstall removes exactly that
    watch/       rebuilds and reinstalls the packages whose sources changed (watchdog)
    pylog/       tails the client's python.log, our lines only

Run it as `uv run python tools/dev --help` (see __main__.py). Python 3 only: it reuses tools/build (layout, archive,
compilers) and setupkit (catalog).
"""
import os
import sys

DEV_DIR = os.path.dirname(os.path.abspath(__file__))
TOOLS_DIR = os.path.dirname(DEV_DIR)
BUILD_DIR = os.path.join(TOOLS_DIR, 'build')
MODPACK_DIR = os.path.dirname(TOOLS_DIR)
DEFAULT_OUT = os.path.join(MODPACK_DIR, 'dist', 'dev')
DEFAULT_CACHE = os.path.join(DEFAULT_OUT, 'thirdparty')

if BUILD_DIR not in sys.path:
    sys.path.insert(0, BUILD_DIR)

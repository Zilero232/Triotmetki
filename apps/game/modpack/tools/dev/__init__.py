# -*- coding: utf-8 -*-
"""dev: the local dev loop — build the packages and install them into the local game client without a release.

    client/      finds the game client the way the manager does (OTMETKI_GAME_DIR first, then Lesta Game Center)
    manager/     sees a modpack install the manager made in that client (its manifest, our packages in mods/<version>)
    selection/   component ids -> our package keys + the third-party runtime mods they need (catalog/catalog.json)
    thirdparty/  OpenWG Gameface and GUIFlash from their pinned sourceUrl, checked by sha256, cached under dist/dev
    builder/     builds the chosen packages with tools/build (bytecode when a compiler is found, sources otherwise)
    deploy/      writes them into mods/<version>/otmetki-dev/ with a manifest; uninstall removes exactly that
    watch/       rebuilds and reinstalls the packages whose sources changed (watchdog)
    pylog/       tails the client's python.log, our lines only

Run it as `python tools/dev --help` on Python 2.7 (see __main__.py). It reuses tools/build (layout, archive,
compilers) and setupkit (catalog).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

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


def text_environ(environ):
    """`environ` with text values: Python 2 hands them out as bytes in the file system encoding (a Cyrillic user name
    in %APPDATA%), which would not join with the text paths."""
    encoding = sys.getfilesystemencoding() or 'utf-8'
    return {key: value.decode(encoding) if isinstance(value, bytes) else value for key, value in environ.items()}

"""The modpack dev loop: build the packages and install them into the local game client without a release.

Usage:
    python tools/dev status
    python tools/dev install [ID ...] [--dry-run] [--offline] [--compiler auto|owg|py27]
    python tools/dev uninstall [--dry-run]
    python tools/dev watch [ID ...] [--offline] [--compiler auto|owg|py27]
    python tools/dev log [--all] [--own] [--no-follow]

IDs are component ids of catalog/catalog.json (package keys: core, companion, ui, marks_panel, ...); none means every
package. Their dependencies come along, and so do OpenWG Gameface and ModsList when a chosen component needs them.
The client is OTMETKI_GAME_DIR or the one the manager would pick (Lesta Game Center). Everything goes into
mods/<version>/otmetki-dev/ with a manifest, and the dev loop refuses to install next to a manager install.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import argparse
import os
import sys

DEV_PARENT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if DEV_PARENT not in sys.path:
    sys.path.insert(0, DEV_PARENT)

from dev import DEFAULT_CACHE, DEFAULT_OUT, text_environ  # noqa: E402
from dev.pylog import safe_output  # noqa: E402
from dev.session import DevError, Session  # noqa: E402


def _add_build_options(parser):
    parser.add_argument('ids', nargs='*', help='component ids (default: every package)')
    parser.add_argument('--offline', action='store_true', help='use only the cached third-party packages')
    parser.add_argument('--compiler', choices=('auto', 'owg', 'py27'), default='auto', help='bytecode compiler')


def parse_args(argv=None):
    parser = argparse.ArgumentParser(prog='tools/dev', description='Three Marks modpack dev loop')
    parser.add_argument('--out', default=DEFAULT_OUT, help='where the dev packages are built (default dist/dev)')
    parser.add_argument('--cache', default=DEFAULT_CACHE, help='third-party package cache (dist/dev/thirdparty)')
    commands = parser.add_subparsers(dest='command')
    commands.add_parser('status', help='print the detected client, the dev install and any manager install')
    install = commands.add_parser('install', help='build and install into mods/<version>/otmetki-dev')
    _add_build_options(install)
    install.add_argument('--dry-run', action='store_true', help='print what would be built and copied, write nothing')
    uninstall = commands.add_parser('uninstall', help='remove exactly what the dev loop installed')
    uninstall.add_argument('--dry-run', action='store_true', help='print what would be removed')
    watch = commands.add_parser('watch', help='install, then rebuild and reinstall on every change')
    _add_build_options(watch)
    log = commands.add_parser('log', help="tail the client's python.log, our lines only")
    log.add_argument('--all', action='store_true', help='every line, not only ours')
    log.add_argument('--own', action='store_true', help='tail mods/configs/otmetki/otmetki.log instead')
    log.add_argument('--no-follow', action='store_true', help='print the last lines and stop')
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    sys.stdout = safe_output(sys.stdout)
    try:
        session = Session(text_environ(os.environ), out_dir=args.out, cache_dir=args.cache)
        getattr(session, args.command)(args)
    except DevError as error:
        sys.stdout.flush()
        sys.stderr.write('error: %s\n' % error)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())

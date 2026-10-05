"""Vendor the pinned Python 2.7-compatible libraries into packages/core/vendor.

Usage: python apps/game/modpack/tools/vendor/vendor.py [--check]

Each pin names a PyPI wheel by version and sha256. The script downloads it, keeps only the runtime
modules, rewrites the library's absolute self-imports to relative ones (the game loads it as
gui.mods.otmetki.core.vendor.<name>), copies its licence to vendor/licenses/ and writes
vendor/__init__.py with the pinned versions. `--check` compares the tree with a fresh vendoring and
fails on any difference (nothing is written).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import argparse
import collections
import contextlib
import hashlib
import io
import json
import os
import re
import shutil
import sys
import tempfile
import urllib2
import zipfile

MODPACK_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VENDOR_DIR = os.path.join(MODPACK_DIR, 'packages', 'core', 'vendor')
PYPI_JSON = 'https://pypi.org/pypi/%s/%s/json'

# attrs' Python 3.6+ API (attr._next_gen) uses keyword-only arguments, which the 2.7 compiler rejects.
ATTR_NEXT_GEN = (
    'if sys.version_info[:2] >= (3, 6):\n'
    '    from ._next_gen import define, field, frozen, mutable  # noqa: F401\n'
    '\n'
    '    __all__.extend(("define", "field", "frozen", "mutable"))\n'
)
ATTR_NEXT_GEN_NOTE = (
    '# Vendored for Python 2.7: attr._next_gen (define/field/frozen/mutable, Python 3.6+ only) is left out.\n'
)

# members: {wheel member prefix: vendor path}; skipped: wheel members left out; patches: (regex, replacement).
Pin = collections.namedtuple('Pin', 'name version wheel sha256 licence members skipped patches')

PINS = (
    Pin(
        name='six',
        version='1.17.0',
        wheel='six-1.17.0-py2.py3-none-any.whl',
        sha256='4721f391ed90541fddacab5acf947aa0d3dc7d27b2e1e8eda2be8970586c3274',
        licence='six-1.17.0.dist-info/LICENSE',
        members={'six.py': 'six.py'},
        skipped=(),
        patches=(),
    ),
    Pin(
        name='blinker',
        version='1.5',
        wheel='blinker-1.5-py2.py3-none-any.whl',
        sha256='1eb563df6fdbc39eeddc177d953203f99f097e9bf0e2b8f9f3cf18b6ca425e36',
        licence='blinker-1.5.dist-info/LICENSE.rst',
        members={'blinker/': 'blinker/'},
        skipped=(),
        patches=((r'\bfrom blinker\.', 'from .'),),
    ),
    Pin(
        name='attrs',
        version='21.4.0',
        wheel='attrs-21.4.0-py2.py3-none-any.whl',
        sha256='2d27e3784d7a565d36ab851fe94887c5eccd6a463168875832a1be79c82828b4',
        licence='attrs-21.4.0.dist-info/LICENSE',
        members={'attr/': 'attr/'},
        skipped=('attr/_next_gen.py',),
        patches=((re.escape(ATTR_NEXT_GEN), ATTR_NEXT_GEN_NOTE),),
    ),
    Pin(
        name='enum34',
        version='1.1.10',
        wheel='enum34-1.1.10-py2-none-any.whl',
        sha256='a98a201d6de3f2ab3db284e70a33b0f896fbf35f8086594e8c9e74b909058d53',
        licence='enum/LICENSE',
        members={'enum/__init__.py': 'enum34/__init__.py'},
        skipped=(),
        patches=(),
    ),
)

INIT = '''"""Third-party libraries vendored for the game's Python 2.7 (see tools/vendor/vendor.py; do not edit by hand).

Import them as `from ..vendor import six` / `from ..vendor import blinker` / `from ..vendor import attr` /
`from ..vendor.enum34 import Enum`. Licences are in `licenses/`.
"""

VENDORED = {
%s}
'''


def wheel_url(pin):
    with contextlib.closing(urllib2.urlopen(PYPI_JSON % (pin.name, pin.version), timeout=60)) as response:
        release = json.loads(response.read().decode('utf-8'))
    for entry in release.get('urls', ()):
        is_pinned_file = entry.get('filename') == pin.wheel
        if is_pinned_file and entry.get('digests', {}).get('sha256') == pin.sha256:
            return entry['url']
    raise SystemExit('%s %s: %s with the pinned sha256 is not on PyPI' % (pin.name, pin.version, pin.wheel))


def download(pin, cache):
    path = os.path.join(cache, pin.wheel)
    if not os.path.isfile(path):
        with contextlib.closing(urllib2.urlopen(wheel_url(pin), timeout=120)) as response:
            data = response.read()
        with open(path, 'wb') as handle:
            handle.write(data)
    with open(path, 'rb') as handle:
        digest = hashlib.sha256(handle.read()).hexdigest()
    if digest != pin.sha256:
        raise SystemExit('%s: sha256 %s does not match the pin %s' % (pin.wheel, digest, pin.sha256))
    return path


def patch(text, patches, member):
    for pattern, replacement in patches:
        updated = re.sub(pattern, lambda match: replacement, text)
        if updated == text:
            raise SystemExit('%s: patch %r did not apply' % (member, pattern))
        text = updated
    return text


def make_dirs(path):
    if not os.path.isdir(path):
        os.makedirs(path)


def write_text(path, text):
    with io.open(path, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text)


def vendor_paths(member, members):
    """The vendor paths (relative, '/'-separated) a wheel member is copied to: one per matching prefix."""
    for prefix, destination in members.items():
        if prefix.endswith('/') and member.startswith(prefix):
            yield destination + member[len(prefix):]
        elif member == prefix:
            yield destination


def vendor_member(wheel, member, pin, target):
    """Copies one wheel module into target with the pin's patches; returns the patterns that applied."""
    applied = set()
    for relative in vendor_paths(member, pin.members):
        text = wheel.read(member).decode('utf-8')
        applicable = [item for item in pin.patches if re.search(item[0], text)]
        applied.update(item[0] for item in applicable)
        path = os.path.join(target, *relative.split('/'))
        make_dirs(os.path.dirname(path))
        write_text(path, patch(text, applicable, member))
    return applied


def vendor_pin(pin, target, cache):
    applied = set()
    with zipfile.ZipFile(download(pin, cache)) as wheel:
        for member in wheel.namelist():
            if member.endswith('.py') and member not in pin.skipped:
                applied.update(vendor_member(wheel, member, pin, target))
        if len(applied) != len(pin.patches):
            raise SystemExit('%s: a patch matched no file' % pin.name)
        write_text(os.path.join(target, 'licenses', pin.name + '.txt'), wheel.read(pin.licence).decode('utf-8'))


def vendor_into(target, cache):
    os.makedirs(os.path.join(target, 'licenses'))
    for pin in PINS:
        vendor_pin(pin, target, cache)
    versions = ["    '%s': '%s',\n" % (pin.name, pin.version) for pin in PINS]
    write_text(os.path.join(target, '__init__.py'), INIT % ''.join(versions))


def snapshot(root):
    files = {}
    for directory, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if d != '__pycache__']
        for name in names:
            if name.endswith('.pyc'):
                continue
            path = os.path.join(directory, name)
            with open(path, 'rb') as handle:
                files[os.path.relpath(path, root).replace(os.sep, '/')] = handle.read()
    return files


def check_against(fresh):
    expected = snapshot(fresh)
    actual = snapshot(VENDOR_DIR)
    differ = sorted(name for name in set(expected) | set(actual) if expected.get(name) != actual.get(name))
    if differ:
        raise SystemExit('packages/core/vendor differs from the pins: %s' % ', '.join(differ))
    print('packages/core/vendor matches the pins')


def replace_vendor_dir(fresh):
    if os.path.isdir(VENDOR_DIR):
        shutil.rmtree(VENDOR_DIR)
    shutil.copytree(fresh, VENDOR_DIR)
    pinned = ', '.join('%s %s' % (pin.name, pin.version) for pin in PINS)
    print('vendored %s into %s' % (pinned, VENDOR_DIR))


def parse_args(argv):
    parser = argparse.ArgumentParser(description='Vendor the pinned py2.7 libraries into packages/core/vendor')
    parser.add_argument('--check', action='store_true', help='fail when packages/core/vendor differs from the pins')
    parser.add_argument('--cache', help='a folder with the pinned wheels (downloaded when missing)')
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    work = tempfile.mkdtemp(prefix='otmetki-vendor-')
    try:
        cache = args.cache or os.path.join(work, 'wheels')
        make_dirs(cache)
        fresh = os.path.join(work, 'vendor')
        vendor_into(fresh, cache)
        if args.check:
            check_against(fresh)
        else:
            replace_vendor_dir(fresh)
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())

"""Sees a modpack install the manager made, so the dev loop never installs next to it.

The manager records an install in %LOCALAPPDATA%\\TriOtmetki\\clients\\<client key>\\manifest.ini (OTMETKI_STATE_ROOT
overrides the root; the key is apps/game/manager/tauri/src/state client_key) and writes our packages straight into
mods/<version>/, where it lists files without descending into subfolders. Two copies of one package id in one client
break the client, and moving the manager's files away would only make its background check put them back, so the dev
loop refuses while either is there: uninstall the modpack in the manager first.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import fnmatch
import hashlib
import os

import attr

STATE_ROOT_ENV = 'OTMETKI_STATE_ROOT'
APP_FOLDER = 'TriOtmetki'
MANIFEST_INI = 'manifest.ini'
KEY_LENGTH = 16
SHOWN_FILES = 3


@attr.s(frozen=True)
class ManagerInstall(object):
    manifest = attr.ib()
    files = attr.ib()

    @property
    def present(self):
        return self.manifest is not None or bool(self.files)

    def describe(self):
        lines = []
        if self.manifest is not None:
            lines.append('  manager manifest: %s' % self.manifest)
        shown = self.files[:SHOWN_FILES]
        lines.extend('  manager package:  %s' % path for path in shown)
        if len(self.files) > len(shown):
            lines.append('  ... and %d more of our packages in that folder' % (len(self.files) - len(shown)))
        return '\n'.join(lines)


def client_key(path):
    """The manager's state folder name for a client: sha256 of the lower-cased path as UTF-16LE, 16 hex digits."""
    text = '%s' % path
    if len(text) > 3:
        text = text.rstrip('\\')
    lowered = ''.join(char.lower() if ord(char) < 128 else char for char in text)
    return hashlib.sha256(lowered.encode('utf-16-le')).hexdigest()[:KEY_LENGTH]


def state_root(environ):
    if environ.get(STATE_ROOT_ENV):
        return environ[STATE_ROOT_ENV]
    return os.path.join(environ.get('LOCALAPPDATA', ''), APP_FOLDER)


def manifest_path(environ, client_path):
    return os.path.join(state_root(environ), 'clients', client_key(client_path), MANIFEST_INI)


def is_owned(name, owned_patterns):
    """A file name the manager takes for ours (catalog ownedPatterns, case-insensitive)."""
    lowered = name.lower()
    return any(fnmatch.fnmatchcase(lowered, pattern.lower()) for pattern in owned_patterns)


def owned_files(mods_dir, owned_patterns):
    """Our packages lying directly in mods/<version>/, as the manager writes them (subfolders are not its)."""
    if not os.path.isdir(mods_dir):
        return ()
    names = sorted(os.listdir(mods_dir))
    paths = [os.path.join(mods_dir, name) for name in names if is_owned(name, owned_patterns)]
    return tuple(path for path in paths if os.path.isfile(path))


def find_install(environ, client, owned_patterns):
    manifest = manifest_path(environ, client.path)
    return ManagerInstall(
        manifest=manifest if os.path.isfile(manifest) else None,
        files=owned_files(client.mods_dir, owned_patterns),
    )

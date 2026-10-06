"""Durable settings: a copy of the files a player cannot recreate, kept outside the game folder.

A mod installer or cleaner may delete `mods/configs`, which holds the binding,
config.json, components.json, profiles.json and state.json. `open_config` hands out a `MirroredFile` for those: every
write goes to `mods/configs/otmetki/<name>` and to `%APPDATA%\\TriOtmetki\\<name>` with one saved-at stamp, and every
read first restores the game-folder copy when it is missing, unreadable or older than the durable one. The newer copy
always wins, so neither side loses a later save. README "Durable settings" documents the layout the manager app reads.

`credentials.json` is not mirrored: `open_secret_pair` hands out its two different halves, the game-folder copy without
the device secret and the %APPDATA% copy with it sealed by DPAPI (`dpapi.SecretBox`).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import time

from ..storage import JsonFile
from .constants import DURABLE_FILES, SECRET_FILES, SECRET_MODE, STAMP_TOLERANCE_S
from .dpapi import SecretBox, secret_box
from .paths import durable_dir
from .stamps import file_mtime, stamps_in, touch

__all__ = ('MirroredFile', 'PrivateFile', 'SecretBox', 'SecretPair', 'open_config', 'open_secret_pair', 'secret_box')

_MISSING = object()


class _Copy(object):

    def __init__(self, directory, name, pretty):
        self.name = name
        self.path = os.path.join(directory, name)
        self.file = JsonFile(self.path, pretty=pretty)
        self.stamps = stamps_in(directory)

    def read(self):
        return self.file.read(_MISSING)

    def stamp(self):
        stamps = [value for value in (self.stamps.get(self.name), file_mtime(self.path)) if value is not None]
        return max(stamps) if stamps else 0.0

    def write(self, data, stamp):
        self.file.write(data)
        touch(self.path, stamp)
        self.stamps.set(self.name, stamp)

    def delete(self):
        self.file.delete()
        self.stamps.set(self.name, None)


def _restrict(path):
    try:
        os.chmod(path, SECRET_MODE)
    except (IOError, OSError):
        pass


class PrivateFile(JsonFile):
    """A JsonFile written owner-only where the platform has mode bits (on Windows the per-user %APPDATA% ACL), each
    write waiting until it is on the disk."""

    write_through = True

    def write(self, data):
        super(PrivateFile, self).write(data)
        _restrict(self.path)


class SecretPair(object):
    """The two halves of a file that holds a secret: `public` in the game folder, `private` in %APPDATA% (None when
    there is no durable folder). Their contents differ, so they are written separately, never mirrored."""

    def __init__(self, public, private):
        self.public = public
        self.private = private


# A `JsonFile` stand-in kept in two folders; a failure of the durable side never fails a save of the game-folder copy.
class MirroredFile(object):

    def __init__(self, primary_dir, mirror_dir, name, pretty=False, clock=time.time):
        self.primary = _Copy(primary_dir, name, pretty)
        self.mirror = _Copy(mirror_dir, name, pretty)
        self.path = self.primary.path
        self.clock = clock

    def read(self, default=None):
        data = self.sync()
        return default if data is _MISSING else data

    def sync(self):
        self.primary.stamps.reload()
        self.mirror.stamps.reload()
        primary = self.primary.read()
        mirror = self._on_mirror(self.mirror.read, _MISSING)
        if primary is _MISSING and mirror is _MISSING:
            return _MISSING

        if primary is _MISSING or (mirror is not _MISSING and self._is_mirror_newer()):
            self._restore_primary(mirror)
            return mirror

        if mirror is _MISSING or self._is_primary_newer():
            stamp = self.primary.stamp()
            self._on_mirror(lambda: self.mirror.write(primary, stamp))
        return primary

    def write(self, data):
        stamp = self.clock()
        self.primary.write(data, stamp)
        self._on_mirror(lambda: self.mirror.write(data, stamp))

    def delete(self):
        self.primary.delete()
        self._on_mirror(self.mirror.delete)

    def _restore_primary(self, data):
        try:
            self.primary.write(data, self.mirror.stamp())
        except (IOError, OSError):
            pass

    def _is_mirror_newer(self):
        return self.mirror.stamp() > self.primary.stamp() + STAMP_TOLERANCE_S

    def _is_primary_newer(self):
        return self.primary.stamp() > self.mirror.stamp() + STAMP_TOLERANCE_S

    @staticmethod
    def _on_mirror(action, fallback=None):
        try:
            return action()
        except (IOError, OSError):
            return fallback


def _is_same_dir(first, second):
    return os.path.normcase(os.path.abspath(first)) == os.path.normcase(os.path.abspath(second))


def open_config(config_dir, name, pretty=False, mirror_dir=_MISSING, clock=time.time):
    """The storage of `mods/configs/otmetki/<name>`: a `MirroredFile` for the `DURABLE_FILES` when the
    durable folder is known, else a plain `JsonFile`. A file with a secret goes through `open_secret_pair`."""
    if name in SECRET_FILES:
        raise ValueError('%s holds a secret: open it with open_secret_pair' % name)
    if mirror_dir is _MISSING:
        mirror_dir = durable_dir()
    is_mirrored = name in DURABLE_FILES and mirror_dir and not _is_same_dir(mirror_dir, config_dir)
    if is_mirrored:
        return MirroredFile(config_dir, mirror_dir, name, pretty, clock)
    return JsonFile(os.path.join(config_dir, name), pretty=pretty)


def open_secret_pair(config_dir, name, private_dir=_MISSING):
    """The game-folder half and the %APPDATA% half of a `SECRET_FILES` file (see SecretPair)."""
    if private_dir is _MISSING:
        private_dir = durable_dir()
    public = JsonFile(os.path.join(config_dir, name))
    public.write_through = True
    has_private = private_dir and not _is_same_dir(private_dir, config_dir)
    return SecretPair(public, PrivateFile(os.path.join(private_dir, name)) if has_private else None)

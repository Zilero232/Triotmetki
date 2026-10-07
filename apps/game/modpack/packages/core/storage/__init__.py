from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os

from ..compat import to_bytes, to_text
from .constants import COMPACT, MOVE_REPLACE_FLAGS, MOVE_WRITE_THROUGH, PRETTY, TEMP_SUFFIX
from .deferred import DeferredFile, flush_pending  # noqa: F401


# Windows' MoveFileExW replaces in one step, which Python 2.7's os lacks (os.replace is 3.3+); False where it fails.
def _move_over(src, dst, write_through):
    flags = MOVE_REPLACE_FLAGS | (MOVE_WRITE_THROUGH if write_through else 0)
    try:
        import ctypes
        return bool(ctypes.windll.kernel32.MoveFileExW(to_text(src), to_text(dst), flags))
    except Exception:
        return False


def replace_file(src, dst, write_through=False):
    """Move `src` over `dst`, replacing it in one step (os.replace, or MoveFileExW on Python 2.7 for Windows), so a
    crash in between never leaves `dst` missing; elsewhere a remove and a rename. `write_through` returns only once
    the move is on the disk (Windows)."""
    replace = getattr(os, 'replace', None)
    if replace is not None:
        replace(src, dst)
        return
    if _move_over(src, dst, write_through):
        return
    if os.path.exists(dst):
        os.remove(dst)
    os.rename(src, dst)


def write_bytes_atomic(path, data, write_through=False):
    """Write `data` to `path` through a temporary file moved over it (`replace_file`), creating the folder first, so
    a crash mid-write never leaves `path` half written."""
    directory = os.path.dirname(path)
    if directory and not os.path.isdir(directory):
        os.makedirs(directory)
    temp_path = path + TEMP_SUFFIX
    with io.open(temp_path, 'wb') as handle:
        handle.write(data)
    replace_file(temp_path, path, write_through)


class JsonFile(object):

    write_through = False

    def __init__(self, path, pretty=False):
        self.path = path
        self.pretty = pretty

    def read(self, default=None):
        try:
            # utf-8-sig: Notepad starts a file with a byte order mark that plain utf-8 reads as bad JSON.
            with io.open(self.path, 'r', encoding='utf-8-sig') as handle:
                return json.load(handle)
        except (IOError, OSError, ValueError):
            return default

    def write(self, data):
        text = json.dumps(data, **(PRETTY if self.pretty else COMPACT))
        write_bytes_atomic(self.path, to_bytes(text), self.write_through)

    def delete(self):
        if os.path.exists(self.path):
            os.remove(self.path)


def account_file(config_dir, pattern, account_id):
    """The JsonFile `pattern % account_id` in `config_dir`: one account's own data of a component."""
    return JsonFile(os.path.join(config_dir, pattern % account_id))

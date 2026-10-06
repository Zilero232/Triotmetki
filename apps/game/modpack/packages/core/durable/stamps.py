from __future__ import absolute_import, division, print_function, unicode_literals

import os

from ..compat import is_number
from ..storage import JsonFile
from .constants import STAMPS_NAME, STAMPS_VERSION

_shared = {}


# One folder's saved_at.json, read once and kept: every file of the folder shares it (`stamps_in`), so a save writes
# the stamps without reading them back; `reload()` (before a sync) picks up what another program wrote there.
class Stamps(object):

    def __init__(self, directory):
        self.directory = directory
        self.file = JsonFile(os.path.join(directory, STAMPS_NAME), pretty=True)
        self.files = None

    def reload(self):
        self.files = None

    def _files(self):
        if self.files is None:
            data = self.file.read({})
            files = data.get('files') if isinstance(data, dict) else None
            self.files = dict(files) if isinstance(files, dict) else {}
        return self.files

    def get(self, name):
        value = self._files().get(name)
        return float(value) if is_number(value) else None

    def set(self, name, stamp):
        files = dict(self._files())
        if stamp is None:
            files.pop(name, None)
        else:
            files[name] = stamp
        self.file.write({'version': STAMPS_VERSION, 'files': files})
        self.files = files


def stamps_in(directory):
    key = os.path.normcase(os.path.abspath(directory))
    if key not in _shared:
        _shared[key] = Stamps(directory)
    return _shared[key]


def file_mtime(path):
    try:
        return os.path.getmtime(path)
    except (IOError, OSError):
        return None


def touch(path, stamp):
    try:
        os.utime(path, (stamp, stamp))
    except (IOError, OSError):
        pass

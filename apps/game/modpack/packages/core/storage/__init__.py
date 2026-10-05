from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os

from ..codec import canonical_json
from ..compat import to_bytes
from .constants import PRETTY


def replace_file(src, dst):
    """Move `src` over `dst`, replacing it (os.replace where the Python has it)."""
    replace = getattr(os, 'replace', None)
    if replace is not None:
        replace(src, dst)
        return
    if os.path.exists(dst):
        os.remove(dst)
    os.rename(src, dst)


class JsonFile(object):

    def __init__(self, path, pretty=False):
        self.path = path
        self.pretty = pretty

    def read(self, default=None):
        try:
            # utf-8-sig: a file the player saved in Notepad starts with a byte order mark plain utf-8 reads as bad JSON.
            with io.open(self.path, 'r', encoding='utf-8-sig') as handle:
                return json.load(handle)
        except (IOError, OSError, ValueError):
            return default

    def write(self, data):
        directory = os.path.dirname(self.path)
        if directory and not os.path.isdir(directory):
            os.makedirs(directory)
        text = json.dumps(data, **PRETTY) if self.pretty else canonical_json(data)
        temp_path = self.path + '.tmp'
        with io.open(temp_path, 'wb') as handle:
            handle.write(to_bytes(text))
        replace_file(temp_path, self.path)

    def delete(self):
        if os.path.exists(self.path):
            os.remove(self.path)


class MemoryFile(object):

    def __init__(self, data=None):
        self.data = data

    def read(self, default=None):
        if self.data is None:
            return default
        return json.loads(canonical_json(self.data))

    def write(self, data):
        self.data = json.loads(canonical_json(data))

    def delete(self):
        self.data = None


def account_file(config_dir, pattern, account_id):
    """The JsonFile `pattern % account_id` in `config_dir`: one account's own data of a component."""
    return JsonFile(os.path.join(config_dir, pattern % account_id))

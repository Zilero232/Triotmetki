"""File helpers the build, the catalogue and the dev loop share: UTF-8 text with LF endings, file hashes, folders and
file replacement on Python 2.7 (no `exist_ok`, no `os.replace`)."""
from __future__ import absolute_import, division, print_function, unicode_literals

import hashlib
import io
import json
import os

CHUNK_SIZE = 1 << 16
# Python 2's json puts ', ' between items even when it indents, which leaves a space at the end of every line.
JSON_SEPARATORS = (',', ': ')


def sha256(path):
    """The lowercase hex sha256 of the file at `path`, read in chunks."""
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for chunk in iter(lambda: handle.read(CHUNK_SIZE), b''):
            digest.update(chunk)
    return digest.hexdigest()


def make_dirs(path):
    """Creates `path` and its parents unless it is already a folder; returns `path`."""
    if not os.path.isdir(path):
        os.makedirs(path)
    return path


def replace_file(source, target):
    """Moves `source` over `target`. Windows refuses a rename onto an existing file, so the old one goes first."""
    if os.path.exists(target):
        os.remove(target)
    os.rename(source, target)


def read_bytes(path):
    with open(path, 'rb') as handle:
        return handle.read()


def write_bytes(path, data):
    """Writes `data`, creating the parent folder; returns `path`."""
    parent = os.path.dirname(path)
    if parent:
        make_dirs(parent)
    with open(path, 'wb') as handle:
        handle.write(data)
    return path


def read_json(path):
    """The JSON value of the UTF-8 file at `path`."""
    with io.open(path, encoding='utf-8') as handle:
        return json.load(handle)


def write_text(path, text):
    """Writes `text` as UTF-8 with LF endings, creating the parent folder; returns `path`."""
    if isinstance(text, bytes):
        text = text.decode('utf-8')
    parent = os.path.dirname(path)
    if parent:
        make_dirs(parent)
    with io.open(path, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text)
    return path


def json_text(value, sort_keys=False):
    """`value` as indented JSON text (non-ASCII kept, no trailing spaces) with a trailing newline."""
    text = json.dumps(value, ensure_ascii=False, indent=2, separators=JSON_SEPARATORS, sort_keys=sort_keys) + '\n'
    return text.decode('utf-8') if isinstance(text, bytes) else text


def write_json(path, value, sort_keys=False):
    """Writes `value` as `json_text` (UTF-8, LF endings), creating the parent folder; returns `path`."""
    return write_text(path, json_text(value, sort_keys))

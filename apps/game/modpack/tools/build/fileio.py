"""File helpers the build, the catalogue and the dev loop share: UTF-8 text with LF endings, file hashes, folders and
file replacement on Python 2.7 (no `exist_ok`, no `os.replace`)."""
from __future__ import absolute_import, division, print_function, unicode_literals

import hashlib
import io
import json
import os

CHUNK_SIZE = 1 << 16


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


def write_json(path, value):
    """Writes `value` as indented UTF-8 JSON (non-ASCII kept) with a trailing newline; returns `path`."""
    return write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + '\n')

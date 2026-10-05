"""File helpers the build, and the catalogue share: UTF-8 text with LF endings and file hashes."""
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


def write_text(path, text):
    """Writes `text` as UTF-8 with LF endings, creating the parent folder; returns `path`."""
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with io.open(path, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text)
    return path


def write_json(path, value):
    """Writes `value` as indented UTF-8 JSON (non-ASCII kept) with a trailing newline; returns `path`."""
    return write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + '\n')

"""The third-party runtime mods (OpenWG Gameface, GUIFlash) a dev install needs, from catalog/catalog.json.

A player's own copy anywhere in mods/<version>/ (four levels deep, the manager's dependencies::find_copies) is used as
it is. Otherwise the pinned `sourceUrl` is downloaded once into dist/dev/thirdparty and every use checks its size and
sha256 against the catalog, so a changed upload never reaches the client.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import shutil
import tempfile
import contextlib
import urllib2

import fileio

PACKAGE_EXTENSIONS = ('mtmod', 'wotmod')
SEARCH_DEPTH = 4
DOWNLOAD_TIMEOUT_S = 60


class ThirdPartyError(RuntimeError):
    """A download failed or a file does not match its pinned sha256."""


def is_copy_of(dependency, file_name):
    """`<packageId>.<ext>` or `<packageId>_<anything>.<ext>`, case-insensitive (the manager's rule)."""
    lowered = file_name.lower()
    stem, _, extension = lowered.rpartition('.')
    package_id = dependency.package_id.lower()
    named = stem == package_id or stem.startswith(package_id + '_')
    return extension in PACKAGE_EXTENSIONS and named


def _key(path):
    return os.path.normcase(os.path.abspath(path))


def find_copies(mods_dir, dependency, skip_dir=None):
    """Copies of `dependency` in mods_dir up to SEARCH_DEPTH levels down, leaving skip_dir (our dev folder) out."""
    found = []
    skipped = _key(skip_dir) if skip_dir else None
    base_depth = mods_dir.rstrip(os.sep).count(os.sep)
    for directory, dirs, files in os.walk(mods_dir):
        depth = directory.rstrip(os.sep).count(os.sep) - base_depth
        dirs[:] = sorted(name for name in dirs if _key(os.path.join(directory, name)) != skipped)
        if depth + 1 >= SEARCH_DEPTH:
            dirs[:] = []
        found.extend(os.path.join(directory, name) for name in sorted(files) if is_copy_of(dependency, name))
    return sorted(found)


def verify(path, dependency):
    """Raises ThirdPartyError unless the file has the catalog's size and sha256."""
    size = os.path.getsize(path)
    if size != dependency.size:
        raise ThirdPartyError('%s: %d bytes, the catalog pins %d' % (path, size, dependency.size))
    digest = fileio.sha256(path)
    if digest != dependency.sha256.lower():
        raise ThirdPartyError('%s: sha256 %s, the catalog pins %s' % (path, digest, dependency.sha256))


def _open_url(url):
    return urllib2.urlopen(url, timeout=DOWNLOAD_TIMEOUT_S)


def _download(url, target):
    handle, partial = tempfile.mkstemp(prefix='.download-', dir=os.path.dirname(target))
    try:
        with os.fdopen(handle, 'wb') as output, contextlib.closing(_open_url(url)) as response:
            shutil.copyfileobj(response, output)
        fileio.replace_file(partial, target)
    finally:
        if os.path.exists(partial):
            os.remove(partial)


def fetch(dependency, cache_dir, offline=False):
    """The verified package file of `dependency` in cache_dir, downloading it when it is not there yet."""
    fileio.make_dirs(cache_dir)
    target = os.path.join(cache_dir, dependency.file)
    if not os.path.isfile(target):
        if offline:
            raise ThirdPartyError('%s is not in %s and --offline forbids the download' % (dependency.file, cache_dir))
        print('Downloading %s from %s' % (dependency.file, dependency.source_url))
        try:
            _download(dependency.source_url, target)
        except (IOError, OSError) as error:
            raise ThirdPartyError('download of %s failed: %s' % (dependency.source_url, error))
    try:
        verify(target, dependency)
    except ThirdPartyError:
        os.remove(target)
        raise
    return target

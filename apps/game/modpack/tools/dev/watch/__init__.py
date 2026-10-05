"""Watch mode: rebuild and reinstall the packages whose sources change.

A changed path maps to the packages that ship it or whose source folder holds it (a new module counts before any
build has seen it): packages/core -> core, packages/companion -> companion, packages/<name> -> that extension (the
built ui-web bundles in packages/ui/gameface included), features/<id> -> that feature, an asset file -> the feature
that ships it. Tests, caches and editor temporaries are ignored. Changes are collected until the tree is quiet for
DEBOUNCE_S, then built and synced in one go.

The client mounts its packages at start and has no reload for Python mods or Gameface pages, so every reinstall ends
with a reminder to restart it; while it runs it keeps the packages open, and the sync is retried until it closes.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import Queue as queue
import time

import layout

DEBOUNCE_S = 0.6
RETRY_S = 5.0
IDLE_S = 3600.0
POLL_S = 0.25
IGNORED_DIRS = ('tests', '__pycache__', '.pytest_cache', '.ruff_cache', 'node_modules')
IGNORED_SUFFIXES = ('.pyc', '.pyo', '.tmp', '.swp', '~', '.part')
RESTART_REMINDER = 'Restart the game client to load the new packages (it has no hot reload for Python mods).'


def _key(path):
    return os.path.normcase(os.path.abspath(path))


def source_roots(package):
    """The folder of a package's sources: packages/<key> (core, companion, extensions), else features/<key>."""
    in_packages = os.path.join(layout.PACKAGES_DIR, package.key)
    return in_packages if os.path.isdir(in_packages) else os.path.join(layout.FEATURES_DIR, package.key)


def is_ignored(path, root=None):
    """Whether a change of `path` is a test, a cache or an editor temporary; only the folders below `root` (the
    modpack) count, so a parent folder of the checkout named `tests` ignores nothing."""
    root = layout.MODPACK_DIR if root is None else root
    inside = _key(path).startswith(_key(root) + os.sep)
    relative = os.path.relpath(path, root) if inside else path
    parts = os.path.normpath(relative).split(os.sep)
    return any(part in IGNORED_DIRS for part in parts) or path.endswith(IGNORED_SUFFIXES)


def packages_for(path, packages):
    """The keys of the packages a change of `path` rebuilds."""
    if is_ignored(path):
        return set()
    changed = _key(path)
    keys = set()
    for package in packages:
        root = _key(source_roots(package))
        ships_it = any(_key(source) == changed for source, _ in package.files)
        if ships_it or changed.startswith(root + os.sep):
            keys.add(package.key)
    return keys


def watched_dirs():
    """The trees a change can come from: packages/, features/ and assets/."""
    candidates = (layout.PACKAGES_DIR, layout.FEATURES_DIR, os.path.join(layout.MODPACK_DIR, 'assets'))
    return [path for path in candidates if os.path.isdir(path)]


class _Collector(object):
    """watchdog handler: every created, modified, moved or deleted file path goes into a queue."""

    def __init__(self, events):
        self.events = events

    def dispatch(self, event):
        if event.is_directory:
            return
        self.events.put(event.src_path)
        destination = getattr(event, 'dest_path', '')
        if destination:
            self.events.put(destination)


def _next(events, deadline):
    """The next queued path, or None once `deadline` passes (short waits keep Ctrl+C working on Windows)."""
    while time.time() < deadline:
        try:
            return events.get(timeout=POLL_S)
        except queue.Empty:
            continue
    return None


def _drain(events, timeout):
    """Paths that arrive until none came for DEBOUNCE_S; an empty set when nothing came within `timeout`."""
    first = _next(events, time.time() + timeout)
    if first is None:
        return set()
    paths = {first}
    while True:
        path = _next(events, time.time() + DEBOUNCE_S)
        if path is None:
            return paths
        paths.add(path)


def _read_packages():
    """The split layout, or None while a half-written source (a feature without its constants, a broken assets.json)
    leaves it unreadable: the watch waits for the next change instead of stopping."""
    try:
        return layout.split_packages('root_init.py')
    except (SystemExit, ValueError, KeyError, OSError) as error:
        print('Package layout unreadable: %s (waiting for the next change)' % error)
        return None


def run(installed_keys, reinstall):
    """Blocks until Ctrl+C. `reinstall(keys)` rebuilds and syncs those packages and returns False to be retried."""
    from watchdog.observers import Observer

    events = queue.Queue()
    observer = Observer()
    for path in watched_dirs():
        observer.schedule(_Collector(events), path, recursive=True)
    observer.start()
    print('Watching %s (Ctrl+C stops)' % ', '.join(watched_dirs()))
    pending = set()
    unmapped = set()
    try:
        while True:
            unmapped |= _drain(events, RETRY_S if pending else IDLE_S)
            packages = _read_packages()
            if packages is None:
                continue
            for path in unmapped:
                pending |= packages_for(path, packages) & set(installed_keys)
            unmapped = set()
            if pending and reinstall(sorted(pending)):
                pending = set()
    except KeyboardInterrupt:
        print('Stopped watching')
    finally:
        observer.stop()
        observer.join()

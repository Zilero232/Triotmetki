from __future__ import absolute_import, division, print_function, unicode_literals

import os

from ....core.compat import is_number, string_types, to_text
from ....core.replay_file import is_replay_name, name_time, read_header
from .constants import INDEX_BUDGET_S, LIBRARY_VERSION, SCAN_MAX_FILES


def _stamp(size, mtime):
    return [int(size), round(float(mtime), 3)]


def _stored_entry(name, entry):
    if not isinstance(name, string_types) or not isinstance(entry, dict):
        return None
    if not isinstance(entry.get('stamp'), list):
        return None
    header = entry.get('header')
    return {'stamp': entry['stamp'], 'header': header if isinstance(header, dict) else None}


def _names_worth_a_stat(names):
    stamped = []
    unstamped = []
    for name in names:
        if not is_replay_name(name):
            continue
        stamp = name_time(name)
        if stamp is None:
            unstamped.append(name)
        else:
            stamped.append((stamp, name))

    stamped.sort(reverse=True)
    newest_stamped = []
    for _stamp_time, name in stamped[:SCAN_MAX_FILES]:
        newest_stamped.append(name)
    return newest_stamped + unstamped


def _newest_files(folder, listdir, stat):
    try:
        names = listdir(folder)
    except (IOError, OSError):
        names = []

    found = []
    for name in _names_worth_a_stat(names):
        path = os.path.join(folder, name)
        try:
            info = stat(path)
        except (IOError, OSError):
            continue
        if is_number(info.st_size) and is_number(info.st_mtime):
            found.append((info.st_mtime, info.st_size, to_text(name), path))

    found.sort(reverse=True)
    return found[:SCAN_MAX_FILES]


def _is_own(header, account_id):
    if not header or header.get('player_id') is None:
        return False
    return int(header['player_id']) == int(account_id)


class ReplayLibrary(object):

    def __init__(self, store, read=None):
        self.store = store
        self.read = read or read_header
        self.entries = {}
        self.files = {}
        self.pending = []
        self.dirty = False
        self._load(store.read({}) if store is not None else {})

    def _load(self, data):
        if not isinstance(data, dict) or data.get('v') != LIBRARY_VERSION:
            return
        files = data.get('files')
        if not isinstance(files, dict):
            return
        for name, entry in files.items():
            stored = _stored_entry(name, entry)
            if stored is not None:
                self.entries[to_text(name)] = stored

    def scan(self, folder, listdir=None, stat=None):
        newest = _newest_files(folder, listdir or os.listdir, stat or os.stat)

        self.files = {}
        for mtime, size, name, path in newest:
            self.files[name] = {'name': name, 'path': path, 'size': int(size), 'mtime': float(mtime)}

        for name in [name for name in self.entries if name not in self.files]:
            del self.entries[name]
            self.dirty = True

        self.pending = [name for _, _, name, _ in newest if self._stale(name)]
        return len(self.files)

    def _stale(self, name):
        entry = self.entries.get(name)
        info = self.files[name]
        return entry is None or entry['stamp'] != _stamp(info['size'], info['mtime'])

    def index(self, clock, budget_s=INDEX_BUDGET_S):
        started = clock()
        done = 0
        while self.pending and (done == 0 or clock() - started < budget_s):
            name = self.pending.pop(0)
            info = self.files.get(name)
            if info is None:
                continue
            self.entries[name] = {'stamp': _stamp(info['size'], info['mtime']), 'header': self.read(info['path'])}
            self.dirty = True
            done += 1
        return done

    def save(self):
        if not self.dirty or self.store is None:
            return False
        files = {name: entry for name, entry in self.entries.items() if name in self.files}
        self.store.write({'v': LIBRARY_VERSION, 'files': files})
        self.dirty = False
        return True

    def progress(self):
        total = len(self.files)
        return total - len(self.pending), total

    def indexing(self):
        return bool(self.pending)

    def _fresh_header(self, name):
        entry = self.entries.get(name)
        if entry is None or self._stale(name):
            return None
        return entry['header']

    def replays(self, account_id):
        if account_id is None:
            return []
        own = []
        for name, info in self.files.items():
            header = self._fresh_header(name)
            if _is_own(header, account_id):
                own.append(dict(info, header=header))
        own.sort(key=lambda replay: (replay['mtime'], replay['name']), reverse=True)
        return own

    def forget(self, name):
        self.files.pop(name, None)
        if self.entries.pop(name, None) is not None:
            self.dirty = True

    def moved(self, old_name, new_name, path):
        info = self.files.pop(old_name, None)
        entry = self.entries.pop(old_name, None)
        if info is None:
            return
        self.files[new_name] = dict(info, name=new_name, path=path)
        if entry is not None:
            self.entries[new_name] = entry
        self.dirty = True


def find_own(replays, name):
    for replay in replays:
        if replay['name'] == name:
            return replay
    return None

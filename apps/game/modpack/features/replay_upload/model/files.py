from __future__ import absolute_import, division, print_function, unicode_literals

import binascii
import os

from ....core.compat import to_bytes, to_text
from ....core.replay_file import EXTENSIONS, is_replay_name, name_time, read_header, same_vehicle
from .constants import (
    EXACT_MATCH,
    FILE_FIELD,
    MATCH_WINDOW_S,
    MAX_CANDIDATES,
    MAX_NAME_LENGTH,
    NAME_STAMP_SLACK_S,
    UNSAFE_NAME_CHARS,
)


def matches(header, account_id, arena_unique_id, started_at, vehicle=None):
    if not header or header.get('player_id') is None or account_id is None:
        return False
    if int(header['player_id']) != int(account_id):
        return False
    if not same_vehicle(header.get('vehicle'), vehicle):
        return False
    if header.get('arena_unique_id'):
        return header['arena_unique_id'] == to_text(arena_unique_id)
    if started_at is None or header.get('date_time') is None:
        return False
    return abs(header['date_time'] - float(started_at)) <= MATCH_WINDOW_S


def closeness(header, arena_unique_id, started_at):
    if header.get('arena_unique_id'):
        return EXACT_MATCH
    return abs(header['date_time'] - float(started_at))


def _is_named_far(name, started_at):
    if started_at is None:
        return False
    stamped = name_time(name)
    if stamped is None:
        return False

    return abs(stamped - float(started_at)) > MATCH_WINDOW_S + NAME_STAMP_SLACK_S


def _stat(path):
    try:
        return os.stat(path)
    except (IOError, OSError):
        return None


def _distance(candidate, started_at):
    mtime, _size, path = candidate
    if started_at is None:
        return -mtime
    stamped = name_time(path)
    moment = stamped if stamped is not None else mtime

    return abs(moment - float(started_at))


def _replay_names(folder):
    try:
        names = os.listdir(folder)
    except (IOError, OSError):
        return []

    replay_names = []
    for name in names:
        if is_replay_name(name):
            replay_names.append(name)
    return replay_names


def _candidates(folder, started_at):
    earliest = None if started_at is None else float(started_at) - MATCH_WINDOW_S

    candidates = []
    for name in _replay_names(folder):
        if _is_named_far(name, started_at):
            continue
        path = os.path.join(folder, name)
        info = _stat(path)
        if info is None:
            continue
        if earliest is None or info.st_mtime >= earliest:
            candidates.append((info.st_mtime, info.st_size, path))

    candidates.sort(key=lambda candidate: _distance(candidate, started_at))
    return candidates[:MAX_CANDIDATES]


def _known_file(known_path):
    if not known_path:
        return []
    info = _stat(known_path)
    if info is None:
        return []

    return [(info.st_mtime, info.st_size, known_path)]


def find_replay(folder, account_id, arena_unique_id, started_at, vehicle=None, known_path=None):
    best = None
    best_closeness = None
    for candidate in _known_file(known_path) + _candidates(folder, started_at):
        mtime, size, path = candidate
        header = read_header(path)
        if not matches(header, account_id, arena_unique_id, started_at, vehicle):
            continue

        candidate_closeness = closeness(header, arena_unique_id, started_at)
        if candidate_closeness == EXACT_MATCH:
            return path, size, mtime
        if best is None or candidate_closeness < best_closeness:
            best = (path, size, mtime)
            best_closeness = candidate_closeness

    return best


def upload_name(path):
    base = os.path.basename(to_text(path))
    stem, extension = os.path.splitext(base)
    stem = UNSAFE_NAME_CHARS.sub('_', stem).strip('_') or 'replay'
    extension = extension.lower()
    if extension not in EXTENSIONS:
        extension = EXTENSIONS[-1]
    return stem[:MAX_NAME_LENGTH] + extension


def new_boundary():
    return '----otmetki' + to_text(binascii.hexlify(os.urandom(12)))


def build_multipart(file_name, data, boundary=None):
    boundary = boundary or new_boundary()
    head = (
        '--%s\r\n'
        'Content-Disposition: form-data; name="%s"; filename="%s"\r\n'
        'Content-Type: application/octet-stream\r\n'
        '\r\n'
    ) % (boundary, FILE_FIELD, upload_name(file_name))
    tail = '\r\n--%s--\r\n' % boundary

    content_type = 'multipart/form-data; boundary=' + boundary
    return content_type, to_bytes(head) + to_bytes(data) + to_bytes(tail)

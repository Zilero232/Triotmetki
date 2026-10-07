from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.vendor import six
from .constants import CURRENT_KEY, ID_PATTERN, IDS_KEY, SHOT_NAME


def _valid_id(value):
    return isinstance(value, six.string_types) and ID_PATTERN.match(value) is not None


def _stored_value(stored, key):
    return stored.get(key) if isinstance(stored, dict) else None


def capture_ids(stored, fallback):
    raw = _stored_value(stored, IDS_KEY)
    listed = [value for value in raw if _valid_id(value)] if isinstance(raw, list) else []
    unique = []
    for value in listed or sorted(fallback):
        if value not in unique:
            unique.append(value)
    return tuple(unique)


def chosen_id(ids, current):
    if current in ids:
        return current
    return ids[0] if ids else None


def next_id(ids, current):
    if current not in ids:
        return chosen_id(ids, None)
    return ids[(ids.index(current) + 1) % len(ids)]


def stored_current(stored):
    value = _stored_value(stored, CURRENT_KEY)
    return value if _valid_id(value) else None


def with_current(stored, ids, current):
    data = dict(stored) if isinstance(stored, dict) else {}
    data[IDS_KEY] = list(ids)
    data[CURRENT_KEY] = current
    return data


def shot_name(component_id):
    return SHOT_NAME % component_id

from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.compat import is_int, is_number, string_types, to_text
from .constants import (
    APPLICABLE_GROUPS,
    GROUP_CONTROLS,
    GROUP_DISPLAY,
    RESOLUTION_FIELDS,
    RESOLUTION_RE,
    SENSITIVITY_PREFIX,
    TEXT_MAX,
)
from .fields import BY_PATH, BY_RAW, FIELDS, TEXT


def _clean_bool(kind, value):
    return value if isinstance(value, bool) else None


def _clean_int(kind, value):
    if not is_number(value) or int(value) != value:
        return None
    value = int(value)
    return value if kind[1] <= value <= kind[2] else None


def _clean_number(kind, value):
    if not is_number(value):
        return None
    value = round(float(value), 4)
    return value if kind[1] <= value <= kind[2] else None


def _clean_text(kind, value):
    if not isinstance(value, string_types):
        return None
    value = to_text(value).strip()
    return value if 0 < len(value) <= TEXT_MAX else None


def _clean_enum(kind, value):
    is_choice = isinstance(value, string_types) and value in kind[1]
    return value if is_choice else None


def _clean_enum_list(kind, value):
    if not isinstance(value, (list, tuple)):
        return None
    items = []
    for item in value:
        if not isinstance(item, string_types) or item not in kind[1]:
            return None
        if item not in items:
            items.append(to_text(item))
    return items


def _clean_resolution(kind, value):
    if not isinstance(value, string_types) or not RESOLUTION_RE.match(value):
        return None
    return to_text(value)


def _clean_fov_range(kind, value):
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        return None
    if not all(is_int(item) for item in value):
        return None
    low, high = int(value[0]), int(value[1])
    return [low, high] if kind[1] <= low <= high <= kind[2] else None


def _clean_text_map(kind, value):
    if not isinstance(value, dict):
        return None
    result = {}
    for key, item in value.items():
        text = _clean_text(TEXT, item)
        if key in kind[1] and text is not None:
            result[to_text(key)] = text
    return result or None


CLEANERS = {
    'bool': _clean_bool,
    'int': _clean_int,
    'num': _clean_number,
    'text': _clean_text,
    'enum': _clean_enum,
    'enum_list': _clean_enum_list,
    'resolution': _clean_resolution,
    'fov_range': _clean_fov_range,
    'text_map': _clean_text_map,
}


def _clean(kind, value):
    cleaner = CLEANERS.get(kind[0])
    if cleaner is None:
        return None
    return cleaner(kind, value)


def clean_values(raw):
    result = {}
    if not isinstance(raw, dict):
        return result
    for key, value in raw.items():
        entry = BY_RAW.get(key)
        if entry is None:
            continue
        cleaned = _clean(entry[3], value)
        if cleaned is not None:
            result[key] = cleaned
    return result


def build_export(raw_settings):
    settings = {}
    values = clean_values(raw_settings)
    for raw_key, group, field, _ in FIELDS:
        if raw_key not in values:
            continue
        node = settings.setdefault(group, {})
        parts = field.split('.')
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = values[raw_key]
    return settings


def flatten_settings(settings):
    raw = {}
    if not isinstance(settings, dict):
        return raw
    for raw_key, group, field, _ in FIELDS:
        node = settings.get(group)
        for part in field.split('.'):
            node = node.get(part) if isinstance(node, dict) else None
        if node is not None:
            raw[raw_key] = node
    return clean_values(raw)


def is_hardware_specific(group, field):
    is_resolution = group == GROUP_DISPLAY and field in RESOLUTION_FIELDS
    is_sensitivity = group == GROUP_CONTROLS and field.startswith(SENSITIVITY_PREFIX)
    return is_resolution or is_sensitivity


def applicable_groups(groups):
    return [group for group in groups or () if group in APPLICABLE_GROUPS]


def plan_apply(current, request, include_resolution=False, include_sensitivity=False):
    request = request or {}
    groups = applicable_groups(request.get('groups'))
    target = flatten_settings(request.get('settings'))
    mine = clean_values(current)
    included_hardware_groups = {'controls': include_sensitivity, 'display': include_resolution}

    changes = []
    for raw_key, group, field, _ in FIELDS:
        if group not in groups or raw_key not in target:
            continue
        if is_hardware_specific(group, field) and not included_hardware_groups[group]:
            continue
        old = mine.get(raw_key)
        new = target[raw_key]
        if old != new:
            changes.append((group, field, old, new))
    return changes


def raw_key_of(group, field):
    entry = BY_PATH.get((group, field))
    return entry[0] if entry is not None else None


def changes_to_values(changes):
    values = {}
    for group, field, _, new in changes:
        key = raw_key_of(group, field)
        if key is not None:
            values[key] = new
    return values

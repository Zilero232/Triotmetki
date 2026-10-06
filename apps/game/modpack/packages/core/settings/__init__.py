"""Settings driven by a schema: defaults, typed merge, clamped numbers, enumerated strings.

A value of the wrong type, an unknown key or a value a normalizer rejects is ignored, so a hand-edited
config.json can never put the mod into a state its schema does not describe.

`fix(schema, values)` turns keys into fixed values: they leave the schema (so the files and the settings window lose
them) while `Settings.get` still answers the constant, so the code that reads them needs no change.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import math

from ..compat import is_int, is_number, string_types, to_text


class Schema(object):

    def __init__(self, defaults, choices=None, limits=None, normalizers=None):
        self.defaults = dict(defaults)
        self.choices = dict(choices or {})
        self.limits = dict(limits or {})
        self.normalizers = dict(normalizers or {})
        self.fixed = {}

    def coerce(self, key, value):
        """The stored form of `value` for `key`, or None when it is rejected."""
        default = self.defaults[key]
        if isinstance(default, bool):
            return value if isinstance(value, bool) else None
        if is_int(default):
            return self._coerce_int(key, value)
        if isinstance(default, string_types):
            return self._coerce_text(key, value)
        return None

    def _coerce_int(self, key, value):
        if not is_number(value) or math.isinf(value) or math.isnan(value):
            return None
        value = int(value)
        low, high = self.limits.get(key, (None, None))
        if low is None:
            return value
        return max(low, min(high, value))

    def _coerce_text(self, key, value):
        if not isinstance(value, string_types):
            return None
        value = to_text(value).strip()
        normalize = self.normalizers.get(key)
        if normalize is not None:
            value = normalize(value)
        if value is None:
            return None
        if key in self.choices and value not in self.choices[key]:
            return None
        return value


# `revision` counts the changes, so a reader on the game thread can keep what it read until it moves.
class Settings(object):

    schema = None

    def __init__(self, values=None, schema=None):
        if schema is not None:
            self.schema = schema
        self.values = dict(self.schema.defaults)
        self.revision = 0
        if values:
            self.update(values)

    def update(self, values):
        """Merge `values`; returns the sorted keys that changed."""
        if not isinstance(values, dict):
            return []

        changed = []
        for key, value in values.items():
            if key not in self.schema.defaults:
                continue
            coerced = self.schema.coerce(key, value)
            if coerced is not None and self.values.get(key) != coerced:
                self.values[key] = coerced
                changed.append(key)
        if changed:
            self.revision += 1
        return sorted(changed)

    def get(self, key):
        if key in self.values:
            return self.values[key]
        return getattr(self.schema, 'fixed', {}).get(key, self.schema.defaults.get(key))

    def is_enabled(self, feature):
        return bool(self.values.get('enabled')) and bool(self.values.get(feature))

    def to_dict(self):
        return dict(self.values)


def fix(schema, values):
    """`schema` without the keys of `values`, which `Settings.get` answers as constants from now on."""
    for key, value in values.items():
        schema.defaults.pop(key, None)
        schema.choices.pop(key, None)
        schema.limits.pop(key, None)
        schema.normalizers.pop(key, None)
        schema.fixed[key] = value
    return schema

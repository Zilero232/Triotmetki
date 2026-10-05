from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import NATIVE, OFF, ON


def tri_state(value):
    """'on' -> True, 'off' -> False, 'native' (leave the game's value) -> None."""
    if value == ON:
        return True
    if value == OFF:
        return False
    return None


def from_table(table):
    """A converter that looks the choice up in `table`; 'native' and unknown choices give None."""
    def convert(value):
        if value == NATIVE:
            return None
        return table.get(value)
    return convert


def native_values(values, fields):
    """{client setting name: value} for the component `values`. `fields` is {key: (name, convert)}; a key
    whose converter gives None (the player keeps the game's own value) is left out."""
    result = {}
    for key, (name, convert) in fields.items():
        if key not in values:
            continue
        converted = convert(values[key])
        if converted is not None:
            result[name] = converted
    return result


def changed_values(before, after):
    """The client settings of `after` that differ from `before`: what a change of a component's section writes, so a
    later change in the game's own settings window survives a change of another key. A value gone from `after` (back
    to 'native') writes nothing."""
    return dict((name, value) for name, value in after.items() if name not in before or before[name] != value)


def setting_names(fields):
    """The client setting names a `fields` table can write, sorted."""
    return tuple(sorted(name for name, _ in fields.values()))


def merge_value(current, value):
    """A dict setting (a reticle's parts) keeps the parts the new value does not mention."""
    if isinstance(current, dict) and isinstance(value, dict):
        result = dict(current)
        result.update(value)
        return result
    return value

from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, from_table, native_values, tri_state
from .constants import (
    DRAW_RANGE,
    MAX_VIEW_RANGE,
    SIZE,
    TRANSPARENCY,
    TRANSPARENCY_ENABLED,
    VEHICLE_NAME_MODES,
    VEHICLE_NAMES,
    VIEW_RANGE,
)

# Deliberately absent (Lesta fair play): lost-enemy markers, gun directions, arty tracers, destroyed objects,
# ally-spot markers, and zoom beyond the client's own size range (that needs patching the Flash minimap).


def _number(value):
    if value == NATIVE:
        return None
    return int(value)


FIELDS = {
    'transparency': (TRANSPARENCY, _number),
    'vehicle_names': (VEHICLE_NAMES, from_table(VEHICLE_NAME_MODES)),
    'view_range': (VIEW_RANGE, tri_state),
    'max_view_range': (MAX_VIEW_RANGE, tri_state),
    'draw_range': (DRAW_RANGE, tri_state),
}


ACCOUNT_FIELDS = {
    'size': (SIZE, _number),
}


def to_native(values):
    result = native_values(values, FIELDS)
    if TRANSPARENCY in result:
        result[TRANSPARENCY_ENABLED] = result[TRANSPARENCY] > 0
    return result


def to_account(values):
    return native_values(values, ACCOUNT_FIELDS)

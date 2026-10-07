from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, TRI_STATE

SWITCH = 'minimap_tweaks'
GROUP = 'battle'

SIZES = (NATIVE, '0', '1', '2', '3', '4', '5')
TRANSPARENCIES = (NATIVE, '0', '20', '40', '60', '80')
# RU 1.45 options.py MinimapVehModelsSetting: never / alt / always, default always.
VEHICLE_NAMES = (NATIVE, 'alt', 'always')
RETIRED_VEHICLE_NAMES = {'never': NATIVE}

DEFAULTS = {
    'size': NATIVE,
    'transparency': NATIVE,
    'vehicle_names': 'always',
    'view_range': 'on',
    'max_view_range': 'on',
    'draw_range': 'off',
}

CHOICES = {
    'size': SIZES,
    'transparency': TRANSPARENCIES,
    'vehicle_names': VEHICLE_NAMES,
    'view_range': TRI_STATE,
    'max_view_range': TRI_STATE,
    'draw_range': TRI_STATE,
}


def normalize_vehicle_names(value):
    return RETIRED_VEHICLE_NAMES.get(value, value)


NORMALIZERS = {'vehicle_names': normalize_vehicle_names}

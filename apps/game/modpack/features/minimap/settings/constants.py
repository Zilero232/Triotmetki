from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, TRI_STATE

SWITCH = 'minimap_tweaks'
GROUP = 'battle'

SIZES = (NATIVE, '0', '1', '2', '3', '4', '5')
TRANSPARENCIES = (NATIVE, '0', '20', '40', '60', '80')
# The game's "extended minimap features" (showVehModelsOnMap, RU 1.45 account_helpers/settings_core/options.py
# MinimapVehModelsSetting: never / alt / always, default always). It is more than the names: ArenaVehiclesPlugin
# ._hideVehicle (gui/Scaleform/daapi/view/battle/shared/minimap/plugins.py) keeps a vehicle that left sight on the map
# at its last spotted point only while it is on, so 'never' empties the minimap of every vehicle out of sight. The
# component never writes 'never'; the game's own settings window still offers it. A new section starts at 'always' and
# switches a game at 'never' once (model.constants ONCE).
VEHICLE_NAMES = (NATIVE, 'alt', 'always')
# A 'never' stored by earlier builds reads as the game's own value: nothing is written over it.
RETIRED_VEHICLE_NAMES = {'never': NATIVE}

# The recommended client values (core.client.native.RecommendedSettingsComponent): the own and the 445 m view circles,
# the minimap's extended features always on (the game's default); size and transparency stay the game's.
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

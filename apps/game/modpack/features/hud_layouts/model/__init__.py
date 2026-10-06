from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.modes import MODES, allowed_panels
from .constants import ACTION_RESET_PLACES


def layout_policy(settings, is_enabled):
    def policy(mode):
        if not is_enabled() or mode not in MODES:
            return None, False
        return allowed_panels(settings.get(mode)), bool(settings.get('own_places'))
    return policy


def place_actions(modes, translate):
    if not modes:
        return []
    names = u', '.join(translate('hud_layouts_' + mode) for mode in modes)
    return [{
        'id': ACTION_RESET_PLACES,
        'label': translate('hud_layouts_reset_places'),
        'confirm': translate('hud_layouts_reset_places_confirm', modes=names),
    }]

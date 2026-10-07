from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_NEUTRAL, COLOR_UP, font
from .constants import TOGGLES

# Fair play: only the game's own options, switched by the player's own key press.


def toggled(value):
    return not bool(value)


def wanted_toggles(settings):
    return tuple((settings.get(key), option) for key, option in TOGGLES)


def option_name(option, translate):
    return translate('battle_hotkeys_option_%s' % option)


def state_name(value, translate):
    if value is None:
        return translate('battle_hotkeys_unavailable')
    return translate('battle_hotkeys_on') if value else translate('battle_hotkeys_off')


def notice_text(option, value, settings, translate):
    size = settings.get('font_size')
    name = font(option_name(option, translate), COLOR_NEUTRAL, size)
    return name + u' ' + font(state_name(value, translate), COLOR_UP if value else COLOR_DOWN, size)

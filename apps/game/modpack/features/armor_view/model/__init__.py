from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int
from .camera import has_moved  # noqa: F401
from .cells import Attack, cell_code, encode_cells  # noqa: F401
from .constants import ARMOR_PATH, DEFAULT_LOCALE, REFUSAL_BATTLE, REFUSAL_NO_TANK, REFUSAL_OFF, SITE_LOCALES, SITE_URL
from .grid import GridBuild, levels_for, screen_box, screen_fraction  # noqa: F401
from .modules import Module, ModuleChoice, Turret, default_choice, picked, with_turret  # noqa: F401
from .page import Attacker, PageView, legend_state, map_state, page_state, shell_label, status_state  # noqa: F401
from .presets import CameraPose, preset_pose  # noqa: F401
from .protocol import decode_message  # noqa: F401
from .readout import readout  # noqa: F401
from .tanks import TankRow, garage_order, is_listed, search  # noqa: F401
from .timing import RayTiming  # noqa: F401

# Fair play: a public page of the site about a tank type; the link carries only the tank id and the language.


def is_tank_id(tank_id):
    return is_int(tank_id) and tank_id > 0


def site_locale(language):
    return language if language in SITE_LOCALES else DEFAULT_LOCALE


def armor_url(tank_id, language):
    if not is_tank_id(tank_id):
        return None
    locale = site_locale(language)
    prefix = '' if locale == DEFAULT_LOCALE else '/' + locale
    return SITE_URL + prefix + ARMOR_PATH % tank_id


def refusal(enabled, in_battle, tank_id):
    if not enabled:
        return REFUSAL_OFF
    if in_battle:
        return REFUSAL_BATTLE
    if not is_tank_id(tank_id):
        return REFUSAL_NO_TANK
    return None


def shows_menu_option(enabled, in_battle, settings, tank_id):
    return refusal(enabled, in_battle, tank_id) is None and bool(settings.get('context_menu'))

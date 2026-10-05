from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import max_length, panel_schema
from ....core.settings import fix
from .constants import (  # noqa: F401
    ADVANCED,
    BARS,
    CARD_DEFAULTS,
    CARD_PANEL_ID,
    COLOR_MODES,
    DEFAULTS,
    FIXED,
    GROUP,
    HANGAR_STYLES,
    LIMITS,
    MAX_TEMPLATE,
    PANEL_ID,
    RETIRED_PLACES,
    STYLES,
    SWITCH,
)

SETTINGS = (SWITCH,)

SCHEMA = fix(panel_schema(
    DEFAULTS,
    choices={'style': STYLES, 'bar': BARS, 'color_mode': COLOR_MODES, 'hangar_style': HANGAR_STYLES},
    limits=LIMITS,
    normalizers={'template': max_length(MAX_TEMPLATE)},
    retired=RETIRED_PLACES,
), FIXED)
CARD_SCHEMA = panel_schema(CARD_DEFAULTS)

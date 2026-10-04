from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import hex_color, max_length, panel_schema
from ....core.settings import fix
from .constants import (  # noqa: F401
    ADVANCED,
    CHOICES,
    COLORS,
    DEFAULTS,
    FIXED,
    ICON_SETS,
    MAX_TEXT,
    PANEL_ID,
    RETIRED_PLACES,
    SWITCH,
)

SETTINGS = (SWITCH,)

SCHEMA = fix(panel_schema(
    DEFAULTS,
    choices=CHOICES,
    normalizers={
        'text': max_length(MAX_TEXT),
        'color': hex_color,
    },
    retired=RETIRED_PLACES,
), FIXED)

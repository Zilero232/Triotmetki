from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import max_length, panel_schema
from ....core.settings import fix
from .constants import (  # noqa: F401
    ADVANCED,
    DEFAULTS,
    FIXED,
    MAX_TEMPLATE,
    OVERLAY_STYLES,
    PANEL_ID,
    RETIRED_PLACES,
    STYLES,
    SWITCH,
)

SETTINGS = (SWITCH,)

SCHEMA = fix(panel_schema(
    DEFAULTS,
    choices={'style': STYLES},
    normalizers={'template': max_length(MAX_TEMPLATE)},
    retired=RETIRED_PLACES,
), FIXED)

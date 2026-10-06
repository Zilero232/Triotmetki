from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import max_length, panel_schema
from ....core.settings import fix
from .constants import (
    ADVANCED,
    DEFAULTS,
    FIXED,
    LIMITS,
    MAX_TEMPLATE,
    PALETTES,
    PANEL_ID,
    RETIRED_PLACES,
    SECTIONS,
    STYLES,
    SWITCH,
    TEMPLATE_KEYS,
)

SETTINGS = (SWITCH,)

NORMALIZERS = {key: max_length(MAX_TEMPLATE) for key in TEMPLATE_KEYS}

SCHEMA = fix(panel_schema(
    DEFAULTS,
    choices={'style': STYLES, 'sections': SECTIONS, 'palette': PALETTES},
    limits=LIMITS,
    normalizers=NORMALIZERS,
    retired=RETIRED_PLACES,
), FIXED)

__all__ = ('ADVANCED', 'PANEL_ID', 'SCHEMA', 'SETTINGS', 'SWITCH')

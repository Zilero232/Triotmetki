from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import max_length, panel_schema
from ....core.settings import fix
from .constants import (  # noqa: F401
    ADVANCED,
    BARS,
    CARD_ADVANCED,
    CARD_DEFAULTS,
    CARD_FIXED,
    CARD_GROUP,
    CARD_LIMITS,
    CARD_PANEL_ID,
    CARD_STYLES,
    CARD_SWITCH,
    COLOR_MODES,
    DEFAULTS,
    FIXED,
    GROUP,
    MAX_TEMPLATE,
    PANEL_ID,
    RETIRED_PLACES,
    STYLES,
    SWITCH,
)

SETTINGS = (SWITCH,)

SCHEMA = fix(panel_schema(
    DEFAULTS,
    choices={'style': STYLES, 'bar': BARS, 'color_mode': COLOR_MODES},
    normalizers={'template': max_length(MAX_TEMPLATE)},
    retired=RETIRED_PLACES,
), FIXED)
CARD_SCHEMA = fix(panel_schema(CARD_DEFAULTS, choices={'style': CARD_STYLES}, limits=CARD_LIMITS), CARD_FIXED)

# The settings window's other components of this feature, each a row with its own page: its components.json section,
# config.json switch, group, folded fields and the editor of model/editor.py.
PARTS = (
    {
        'id': CARD_PANEL_ID,
        'switch': CARD_SWITCH,
        'group': CARD_GROUP,
        'advanced': CARD_ADVANCED,
        'editor': 'card_editor',
    },
)

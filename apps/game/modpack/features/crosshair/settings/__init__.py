from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud import panel_schema
from ....core.settings import Schema
from ..model import normalize_mark
from .constants import (  # noqa: F401
    CHOICES,
    CIRCLE_CHOICES,
    CIRCLE_DEFAULTS,
    CIRCLE_GROUP,
    CIRCLE_PANEL_ID,
    CIRCLE_SWITCH,
    DEFAULTS,
    GROUP,
    LIMITS,
    PANEL_ID,
    SWITCH,
)

SETTINGS = (SWITCH,)
SCHEMA = panel_schema(DEFAULTS, choices=CHOICES, limits=LIMITS, normalizers={'mark': normalize_mark})
CIRCLE_SCHEMA = Schema(CIRCLE_DEFAULTS, choices=CIRCLE_CHOICES)

# The settings window's other component of this feature: the smaller aim circle, a row with its own switch and page.
PARTS = (
    {
        'id': CIRCLE_PANEL_ID,
        'switch': CIRCLE_SWITCH,
        'group': CIRCLE_GROUP,
        'advanced': (),
        'editor': 'circle_editor',
    },
)

from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.settings import Schema, fix
from .constants import ADVANCED, DEFAULTS, FIXED, GROUP, SECTION, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = fix(Schema(DEFAULTS), FIXED)

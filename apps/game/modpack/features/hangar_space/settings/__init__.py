from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.settings import Schema
from ..model import normalize_look, normalize_space
from .constants import ADVANCED, DEFAULTS, GROUP, SECTION, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = Schema(DEFAULTS, normalizers={'space': normalize_space, 'look': normalize_look})

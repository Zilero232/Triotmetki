from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.settings import Schema
from ..model import normalize_hotkey
from .constants import CHOICES, DEFAULTS, GROUP, SECTION, SWITCH  # noqa: F401

SETTINGS = (SWITCH,)
SCHEMA = Schema(DEFAULTS, choices=CHOICES, normalizers={'hotkey': normalize_hotkey})

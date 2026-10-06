from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.native_settings import NATIVE, TRI_STATE

SWITCH = 'hangar_auto_resupply'
SECTION = 'auto_resupply'
GROUP = 'hangar'

FLAGS = ('auto_repair', 'auto_load', 'auto_equip', 'auto_boosters')

DEFAULTS = {flag: NATIVE for flag in FLAGS}
CHOICES = {flag: TRI_STATE for flag in FLAGS}

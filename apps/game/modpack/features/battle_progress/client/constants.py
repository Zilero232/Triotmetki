# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# The client's own message for an own shot that hit an ally («Попадание в союзника»): Avatar.showShotResults sends it
# for an ally hit by a direct projectile or damaged by the shot (msgs_ctrl.showAllyHitMessage, RU 1.45).
ALLY_HIT_MESSAGE = 'ALLY_HIT'

# A reached threshold shows its full bar this long (s), then the row keeps one line.
REACHED_BAR_S = 3.0

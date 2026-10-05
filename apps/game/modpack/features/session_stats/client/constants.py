from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.panel import dock_layout
from ....core.me import OK_STATUS

HANGAR_PANEL = 'otmetki.session'
LAYOUT = dock_layout('hangar_left')
STATE_KEY = 'session'
SENT_STATUSES = (OK_STATUS, 202)

# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.panel import dock_layout

STATE_IN_PROGRESS = 'in_progress'
STATES = (STATE_IN_PROGRESS, 'done', 'honors')
MAX_MISSIONS = 60
MAX_TEXT = 200
# The page row badge of a finished mission.
MARK_OF = {'done': u'✓', 'honors': u'✓✓'}
TITLE_SIZE_STEP = 2
# The card (model/widget.py): its width in design px and the row status mark of each mission state.
CARD_WIDTH = 260
STATUS_OF = {'in_progress': 'active', 'done': 'done', 'honors': 'honors'}
# The missions screen changes the missions in the hangar: the label re-reads them this often.
REFRESH_EVERY_S = 10.0

HANGAR_PANEL = 'otmetki.personal_missions'
HANGAR_LAYOUT = dock_layout('hangar_right')

# The sample missions' texts are i18n keys (model/preview.py translates them).
PREVIEW_MISSIONS = (
    {
        'id': 1,
        'name': 'pm_preview_1_name',
        'main': 'pm_preview_1_main',
        'extra': 'pm_preview_1_extra',
        'state': STATE_IN_PROGRESS,
    },
    {
        'id': 2,
        'name': 'pm_preview_2_name',
        'main': 'pm_preview_2_main',
        'extra': u'',
        'state': STATE_IN_PROGRESS,
    },
    {'id': 3, 'name': 'pm_preview_3_name', 'main': u'', 'extra': u'', 'state': 'honors'},
)
PREVIEW_TEXT_KEYS = ('name', 'main', 'extra')

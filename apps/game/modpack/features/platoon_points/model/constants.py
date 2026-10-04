# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

KIND = 'platoon_points'
# The row fields the widget passes on as they are.
MEMBER_KEYS = ('name', 'own', 'points', 'damage', 'assist', 'frags', 'hp', 'max', 'alive')
MAX_NAME = 24
PREVIEW_SIZE = (240, 90)
# vehicle id: (the member as the arena lists it, HP, frags)
PREVIEW_MEMBERS = (
    (1, {'name': u'Вы', 'own': True, 'class': 'heavyTank', 'max_hp': 2000, 'alive': True}, 1340, 2),
    (2, {'name': u'Союзник', 'own': False, 'class': 'mediumTank', 'max_hp': 1600, 'alive': False}, 0, 1),
)
PREVIEW_OWN = {'damage': 2450, 'assist': 610}

# The settings window editor: field groups (spec 2026-09-30 section 12.3).
EDITOR_GROUPS = (
    ('shown', ('show_platoon', 'show_solo')),
)

# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

KIND = 'platoon_points'
KIND_DAMAGE = 'damage'
KIND_ASSIST = 'assist'
OWN_KINDS = (KIND_DAMAGE, KIND_ASSIST)
MEMBER_KEYS = ('name', 'own', 'points', 'damage', 'assist', 'frags', 'hp', 'max', 'alive')
MAX_NAME = 24
PREVIEW_SIZE = (240, 90)
PREVIEW_OWN_NAME = 'platoon_points_preview_own'
PREVIEW_MATE_NAME = 'platoon_points_preview_mate'
PREVIEW_MEMBERS = (
    (1, {'name': PREVIEW_OWN_NAME, 'own': True, 'class': 'heavyTank', 'max_hp': 2000, 'alive': True}, 1340, 2),
    (2, {'name': PREVIEW_MATE_NAME, 'own': False, 'class': 'mediumTank', 'max_hp': 1600, 'alive': False}, 0, 1),
)
PREVIEW_OWN = {'damage': 2450, 'assist': 610}

EDITOR_GROUPS = (
    ('shown', ('show_platoon', 'show_solo')),
)

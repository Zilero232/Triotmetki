# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

MAX_ITEMS = 6
MAX_NAME = 60
MAX_EFFECT = 240
# The stock marks of a special device over its icon (RU 1.45 gui/shared/gui_items/artefacts.py getOverlayType): deluxe
# (the «+» devices), modernized by level, trophy and upgraded trophy.
OVERLAY_PATH = 'gui/maps/icons/quests/bonuses/small/%s_overlay.png'
OVERLAY_DELUXE = 'equipmentPlus'
OVERLAY_MODERNIZED = 'equipmentModernized_%d'
OVERLAY_TROPHIES = {'basic': 'equipmentTrophyBasic', 'upgraded': 'equipmentTrophyUpgraded'}
MAX_MODERNIZED_LEVEL = 3
# The frame of a directive over its artefact icon (RU 1.45 gui/impl/common/ammunition_panel/ammunition_panel_blocks.py
# BattleBoostersBlock._updateOverlayAspects: ItemHighlightTypes.BATTLE_BOOSTER, and BATTLE_BOOSTER_REPLACE for a crew
# directive standing in for a skill the crew has not learnt), the artefact folder's own files of the artefact icon size.
BOOSTER_OVERLAY_PATH = 'gui/maps/icons/artefact/%s.png'
BOOSTER_OVERLAYS = {'boost': 'battleBooster_overlay', 'replace': 'battleBooster_replace_overlay'}
ICON_FALLBACK = 'module'
BONUS_MARK = u'★'
ATTENTION_MARK = u'!'
# The GUIFlash row draws only images: a device whose icon the client lacks keeps its cell with a mark, not a name.
MISSING_ICON_MARK = u'◆'
# The item marks the widget draws: specialisation slot, boosted by the directive, directive without effect,
# running, spent.
FLAGS = ('bonus', 'boosted', 'attention', 'active', 'used')

PREVIEW_SIZE = (400, 60)

# The log line of a battle's first read and of every read that finds something else.
SUMMARY = 'battle_loadout: %d devices, %d directives, icons found %d'
SUMMARY_EMPTY = 'battle_loadout: nothing to show, %s'
# The slots of a read in the same line: where they came from, then each device slot's intCD.
SLOTS = 'slots from %s: %s'
SLOT_ENTRY = '%d %s'
SLOT_EMPTY = 'empty'

# What a cell of the row holds: an equipment slot or a directive slot (the page draws a divider between the two).
KIND_DEVICE = 'device'
KIND_DIRECTIVE = 'directive'

# The cells as large as the stock consumables panel's under the row (RU 1.45 gui_battle ConsumablesPanel.as: a button
# every ITEM_WIDTH_PADDING = 57 px of the battle stage, whose artefact icons are 48 px (gui/maps/icons/artefact)); the
# page draws rem, which the client scales with the interface like the stock panel. A cell is the icon, 1 px of padding
# and a 1 px frame on each side.
STOCK_ICON = 48
STOCK_PITCH = 57
CELL_FRAME = 4

KIND = 'battle_loadout'
PREVIEW_DEVICES = [
    {
        'name': u'Турбонагнетатель',
        'effect': u'+10 % к максимальной скорости и мощности двигателя.',
        'icon': 'turbocharger',
        'bonus': True,
    },
    {
        'name': u'Улучшенная вентиляция',
        'effect': u'+5 % к основным навыкам экипажа.',
        'icon': 'improvedVentilation',
        'deluxe': True,
    },
    {
        'name': u'Досылатель',
        'effect': u'−10 % к времени перезарядки.',
        'icon': 'rammer',
        'bonus': True,
        'boosted': True,
    },
    {
        'name': u'Маскировочная сеть',
        'effect': u'+ к маскировке неподвижной машины.',
        'icon': 'camouflageNet',
        'active': True,
    },
    {
        'name': u'Досылатель: директива',
        'effect': u'Усиливает досылатель: −2,5 % к времени перезарядки.',
        'icon': 'rammer',
        'booster': 'boost',
    },
]

# The settings window's editor: the equipment row as the preview, its one option folded under «Дополнительно».
EDITOR_GROUPS = ()

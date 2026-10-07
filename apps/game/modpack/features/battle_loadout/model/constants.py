# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

MAX_ITEMS = 6
MAX_NAME = 60
MAX_EFFECT = 240
# RU 1.45 gui/shared/gui_items/artefacts.py getOverlayType.
OVERLAY_PATH = 'gui/maps/icons/quests/bonuses/small/%s_overlay.png'
OVERLAY_DELUXE = 'equipmentPlus'
OVERLAY_MODERNIZED = 'equipmentModernized_%d'
OVERLAY_TROPHIES = {'basic': 'equipmentTrophyBasic', 'upgraded': 'equipmentTrophyUpgraded'}
MAX_MODERNIZED_LEVEL = 3
# RU 1.45 ammunition_panel_blocks.py BattleBoostersBlock._updateOverlayAspects (ItemHighlightTypes).
BOOSTER_OVERLAY_PATH = 'gui/maps/icons/artefact/%s.png'
BOOSTER_OVERLAYS = {'boost': 'battleBooster_overlay', 'replace': 'battleBooster_replace_overlay'}
ICON_FALLBACK = 'module'
BONUS_MARK = u'★'
ATTENTION_MARK = u'!'
MISSING_ICON_MARK = u'◆'
FLAGS = ('bonus', 'boosted', 'attention', 'active', 'used')

PREVIEW_SIZE = (400, 60)

SUMMARY = 'battle_loadout: %d devices, %d directives, icons found %d'
SUMMARY_EMPTY = 'battle_loadout: nothing to show, %s'
SLOTS = 'slots from %s: %s'
SLOT_ENTRY = '%d %s'
SLOT_EMPTY = 'empty'

KIND_DEVICE = 'device'
KIND_DIRECTIVE = 'directive'

# RU 1.45 gui_battle ConsumablesPanel.as: ITEM_WIDTH_PADDING = 57 px, artefact icons 48 px.
STOCK_ICON = 48
STOCK_PITCH = 57
CELL_FRAME = 4

KIND = 'battle_loadout'
PREVIEW_DEVICES = [
    {
        'name': 'battle_loadout_preview_turbocharger',
        'effect': 'battle_loadout_preview_turbocharger_effect',
        'icon': 'turbocharger',
        'bonus': True,
    },
    {
        'name': 'battle_loadout_preview_ventilation',
        'effect': 'battle_loadout_preview_ventilation_effect',
        'icon': 'improvedVentilation',
        'deluxe': True,
    },
    {
        'name': 'battle_loadout_preview_rammer',
        'effect': 'battle_loadout_preview_rammer_effect',
        'icon': 'rammer',
        'bonus': True,
        'boosted': True,
    },
    {
        'name': 'battle_loadout_preview_net',
        'effect': 'battle_loadout_preview_net_effect',
        'icon': 'camouflageNet',
        'active': True,
    },
    {
        'name': 'battle_loadout_preview_directive',
        'effect': 'battle_loadout_preview_directive_effect',
        'icon': 'rammer',
        'booster': 'boost',
    },
]
PREVIEW_TEXT_KEYS = ('name', 'effect')

EDITOR_GROUPS = ()

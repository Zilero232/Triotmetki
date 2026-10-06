from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.moe import COLOR_MODES  # noqa: F401

GROUP = 'battle'
SWITCH = 'battle_moe_panel'
PANEL_ID = 'marks_panel'
# The hangar Tank card keeps the panel id of the former hangar_marks component, so its components.json section and
# the player's place of it survive the merge. It is a component of its own in the settings window (its own switch,
# options and editor page), as the packs keep the battle marks panel apart from the hangar marks info.
CARD_PANEL_ID = 'hangar_marks'
CARD_SWITCH = 'hangar_tank_card'
CARD_GROUP = 'hangar'
STYLE_COMPACT = 'compact'
STYLE_EXTENDED = 'extended'
STYLE_MINIMAL = 'minimal'
STYLE_CUSTOM = 'custom'
STYLES = (STYLE_COMPACT, STYLE_EXTENDED, STYLE_MINIMAL, STYLE_CUSTOM)
CARD_STYLES = (STYLE_COMPACT, STYLE_EXTENDED)
# The bar of the battle plate, as the gunmarks panels offer it: this battle's damage against the average that holds the
# percent (their default), or the percent on the 0-100 % scale with the 65/85/95 ticks.
BARS = ('damage', 'percent')
MAX_TEMPLATE = 400

# The battle panel, lean as the gunmarks panels of PROTanki, Near_You and Lebwa and XVM's marks macros keep it: the
# percent and its projection after the battle, the damage to the next goal, colour and style; no Alt view, so the panel
# never outgrows the place the player gives it. Right of the stock consumables panel, its bottom on the panel's bottom,
# as Lebwa and PROTanki place the marks: the page puts its left edge 12 px right of the panel's live width
# (core/hud/panel ATTACHED bar_right); this place (centred 330 px right of the middle) is the one for the fallback
# width.
DEFAULTS = {
    'x': 330,
    'y': 0,
    'align_x': 'center',
    'align_y': 'bottom',
    'style': 'compact',
    'template': '',
    'show_targets': True,
    'show_battle': True,
    'show_step': True,
    'show_up': True,
    'color_mode': 'delta',
    'bar': 'damage',
}
# Retired options and the values the code keeps reading: the marks step of half a percent.
FIXED = {
    'step': '0.5',
}
ADVANCED = ('show_battle', 'show_step', 'show_up', 'template')
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
RETIRED_PLACES = (
    (0, 120, 'center', 'top'),
    (208, 8, 'left', 'top'),
    (490, -6, 'left', 'bottom'),
    (372, 60, 'left', 'top'),
    (330, -8, 'center', 'bottom'),
)

# The hangar Tank card: the detailed view of the selected tank (trend, thresholds, battles to the mark, the history,
# on Alt the WN8, mastery and research) and XVM's and PMOD's MoE percent on the carousel tiles (off as the stock stats
# row it joins).
CARD_DEFAULTS = {
    'x': 16,
    'y': 440,
    'align_x': 'left',
    'align_y': 'top',
    'style': 'compact',
    'alt_detail': True,
    'show_trend': True,
    'trend_battles': 5,
    'show_tank_ratings': True,
    'show_mastery': True,
    'show_research': True,
    'carousel_percent': False,
}
CARD_LIMITS = {
    'trend_battles': (1, 50),
}
# The history kept per tank and the tanks on the history page.
CARD_FIXED = {
    'max_entries': 100,
    'page_rows': 50,
}
CARD_ADVANCED = ('show_mastery', 'show_research', 'trend_battles')

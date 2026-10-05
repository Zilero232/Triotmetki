from __future__ import absolute_import, division, print_function, unicode_literals

GROUP = 'battle'
SWITCH = 'battle_moe_panel'
PANEL_ID = 'marks_panel'
# The hangar Tank card keeps the panel id of the former hangar_marks component, so its components.json section and
# the player's place of it survive the merge.
CARD_PANEL_ID = 'hangar_marks'
# `silhouette`: the own tank's contour filled to the percent; `compact`: the framed box with the progress line.
STYLES = ('compact', 'silhouette', 'extended', 'minimal', 'custom')
HANGAR_STYLES = ('compact', 'extended')
COLOR_MODES = ('delta', 'mark', 'off')
# The bar of the battle plate, as the gunmarks panels offer it: this battle's damage against the average that holds the
# percent (their default), or the percent on the 0-100 % scale with the 65/85/95 ticks.
BARS = ('damage', 'percent')
MAX_TEMPLATE = 400

# Right of the stock consumables panel, 8 px over the bottom edge, as Lebwa and PROTanki place the marks: the page puts
# its left edge 12 px right of the panel's live width (core/hud/panel ATTACHED bar_right); this place (centred 330 px
# right of the middle) is the one for the fallback width and the GUIFlash renderer.
DEFAULTS = {
    'x': 330,
    'y': -8,
    'align_x': 'center',
    'align_y': 'bottom',
    'style': 'compact',
    'template': '',
    'show_targets': True,
    'show_battle': True,
    'show_step': True,
    'show_battles': True,
    'show_up': True,
    'alt_detail': True,
    'color_mode': 'delta',
    'bar': 'damage',
    'show_battle_panel': True,
    'hangar_card': True,
    'hangar_style': 'compact',
    'show_trend': True,
    'trend_battles': 5,
    'show_tank_ratings': True,
    'show_mastery': True,
    'show_research': True,
    # XVM's and PMOD's MoE percent on the carousel tiles; off as the stock stats row it joins.
    'carousel_percent': False,
}
LIMITS = {
    'trend_battles': (1, 50),
}
# Retired options and the values the code keeps reading: the marks step of half a percent, the history kept per tank
# and the tanks on the history page.
FIXED = {
    'step': '0.5',
    'max_entries': 100,
    'page_rows': 50,
}
ADVANCED = ('show_battle', 'show_step', 'show_up', 'show_mastery', 'show_research', 'trend_battles', 'template')
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
RETIRED_PLACES = (
    (0, 120, 'center', 'top'),
    (208, 8, 'left', 'top'),
    (490, -6, 'left', 'bottom'),
    (372, 60, 'left', 'top'),
)

CARD_DEFAULTS = {
    'x': 16,
    'y': 440,
    'align_x': 'left',
    'align_y': 'top',
}

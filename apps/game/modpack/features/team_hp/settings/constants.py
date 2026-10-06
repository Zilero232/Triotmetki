from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_DOWN, COLOR_UP

SWITCH = 'battle_team_hp'
PANEL_ID = 'team_hp'
# full: bar pair with the score between; segments: a segment per tank; icons: class icons with a bar each; compact and
# minimal: numbers and score in one line; numbers and bars: the older one-part styles. A bar per tank (icons) is the
# default, the owner's call.
STYLES = ('full', 'segments', 'icons', 'compact', 'minimal', 'numbers', 'bars')
# Styles drawn beside the stock score strip instead of in its place.
OVERLAY_STYLES = ('numbers',)
# Where a pinned strip that keeps the stock score strip sits (centre offset, top): right of it, in the top row between
# it and the battle clock. Under the stock strip the page keeps the capture bars and the quest progress (RU 1.45
# gui_battle BattlePage.as), so nothing of ours goes there. The stock strip reaches 343 design px either side of the
# centre (BaseTeamHealthBar.as: bars of 234 px from 109 px off the centre); 443 leaves 180 px of text clear of it and of
# the clock left of the stock timer on the smallest battle screen (1707 design px wide).
BESIDE_STOCK_PLACE = (443, 4)
MAX_TEMPLATE = 400

DEFAULTS = {
    'x': 0,
    'y': 0,
    'align_x': 'center',
    'align_y': 'top',
    'style': 'icons',
    'show_score': True,
    'show_alive': False,
    'show_diff': True,
    'template': '',
    'replace_stock': True,
    'pinned': True,
}
# Retired options and the values the code keeps reading: the bar widths of the text styles and the up and down tones
# of the HUD (spec section 6.4) for the two sides.
FIXED = {
    'bar_width': 30,
    'icon_width': 3,
    'ally_color': COLOR_UP,
    'enemy_color': COLOR_DOWN,
}
ADVANCED = ('replace_stock', 'pinned', 'template')
# The default places of older versions (x, y, align_x, align_y): a panel still at one moves to today's default.
RETIRED_PLACES = (
    (0, 58, 'center', 'top'),
    (0, 4, 'center', 'top'),
)

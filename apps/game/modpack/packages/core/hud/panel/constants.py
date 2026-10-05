from __future__ import absolute_import, division, print_function, unicode_literals

import re

from ..stock.constants import CONSUMABLES_PANEL

ALIAS_PREFIX = 'otmetki.hud.'

PANEL_DEFAULTS = {
    'x': 0,
    'y': 0,
    'align_x': 'center',
    'align_y': 'top',
    'alpha': 100,
    'drag': True,
    'scale': 100,
}
# Panel keys the settings window no longer offers: constants `Settings.get` answers (a panel's own default wins).
PANEL_FIXED = {
    'font_size': 14,
    'border': False,
}

PANEL_CHOICES = {
    'align_x': ('left', 'center', 'right'),
    'align_y': ('top', 'center', 'bottom'),
}

PANEL_LIMITS = {
    'x': (-4000, 4000),
    'y': (-4000, 4000),
    'alpha': (0, 100),
    'scale': (50, 300),
}

LAYOUT_KEYS = ('x', 'y', 'align_x', 'align_y', 'alpha', 'drag', 'border', 'scale')
# The keys of a panel's place (its anchor and the offset from it).
PLACE_KEYS = ('x', 'y', 'align_x', 'align_y')
# (offset key, anchor key, near edge, far edge): an offset is in design px from its anchor edge, the unit the page
# multiplies by the interface scale, so it points into the screen at every resolution unless it points past the edge
# it is measured from (negative from the left or top, positive from the right or bottom).
FIT_AXES = (('x', 'align_x', 'left', 'right'), ('y', 'align_y', 'top', 'bottom'))

HEX_COLOR = re.compile(r'^#[0-9A-Fa-f]{6}$')

# The renderer's anchor props after a drag, and the settings keys they are saved to.
MOVED_ALIGNS = (('alignX', 'align_x'), ('alignY', 'align_y'))

# Renderer props only the Gameface HUD page draws; GUIFlash's Flash labels are never sent them.
GAMEFACE_PROPS = ('scale', 'kind', 'widget', 'dock', 'attach', 'hint', 'cover')

# A panel's tooltip on the Gameface page is the short description of the component that draws it, its
# `component_<id>_hint` string: the id follows the alias prefix (`otmetki.hud.<id>`, `otmetki.<id>[.<part>]`) unless the
# table names it.
HINT_KEY = 'component_%s_hint'
HINT_PREFIXES = (ALIAS_PREFIX, 'otmetki.')
HINT_COMPONENTS = {'otmetki.session': 'session_stats', 'otmetki.ui.button': 'settings_button'}

# Docked columns: panels at their group's anchor stack one under (or, for a bottom anchor, above) the other with the
# page's gap between them (ui-web views/hud/lib/dock), in `order`, so default places never overlap whatever
# each panel's height is. A panel the player moved (its place differs from the anchor) leaves the column. Keys are the
# panels' aliases (HUD panels `otmetki.hud.<id>`, hangar labels their own alias); every member's default place is its
# group's anchor (tools/tests check it).
#
# `reserve`: the strip at the far end of a column (design px from the bottom edge, or from the top one for a bottom
# anchor) a panel never enters: a top-anchored column first moves up (not above `ceiling`, design px from the top, when
# the group names one), then the next panel starts a new column beside the first.
#
# Battle anchors are in design px, the unit of the stock Scaleform battle page at every interface scale (RU 1.45 client
# source: AbstractApplication.as sets the stage to the screen over the scale; the Gameface root font size is the same
# scale, so 1 rem of the HUD page is 1 px of the battle page). The smallest battle screen the client allows is
# 2560x1440 at 1.5 (1707x960 design px; gui/shared/utils/graphics.py _SCALES). Stock boxes they keep clear (gui_battle
# AS3 sources): the team lists (PlayersPanel: x 0 / W, 25 px rows from about y 45, at most 368 px wide with badges in
# the full mode), the score strip (fragCorrelationBar, centred at the top), the timer (battleTimer, 184 px at the top
# right), the damage panel (230 x about 240 at the bottom left) with the chat above it, the consumables (57 px slots,
# centred, 58 px from the bottom), the minimap (bottom right) and the sixth sense lamp (W/2 - 109, H/2 - 225). Under the
# score strip the page keeps the team bases panel (capture bars, 34 px each, from about y 62 as EpicBattlePage.as places
# it) and the quest progress under it (BattlePage.updatePositionForQuestProgress: bases y + 45 + their height); hiding
# the score strip moves neither, so no column starts under the score strip in the middle of the top edge.
DOCK_ANCHORS = {
    # Right of the stock damage panel, in the stock damage log's place (BattlePage.as: x 229, the damage panel's
    # top + 3).
    'battle_left_bottom': {'x': 232, 'y': -6, 'align_x': 'left', 'align_y': 'bottom', 'reserve': 560},
    # Right of the left team list in its widest mode and under the score strip, above the damage log column.
    'battle_left_top': {'x': 372, 'y': 60, 'align_x': 'left', 'align_y': 'top', 'reserve': 290, 'ceiling': 60},
    # Hangar: left column under the crew (the Tank card, then Session, docs/specs/2026-09-30-hud-consolidation-and-
    # design.md section 7.2), right column under the vehicle parameters, both above the tank carousel (one row with its
    # filter bar is about 190 tall).
    'hangar_left': {'x': 16, 'y': 440, 'align_x': 'left', 'align_y': 'top', 'reserve': 196},
    'hangar_right': {'x': -16, 'y': 570, 'align_x': 'right', 'align_y': 'top', 'reserve': 190},
}
DOCKS = {
    'otmetki.hud.damage_log': ('battle_left_bottom', 0),
    'otmetki.hud.platoon_points': ('battle_left_top', 0),
    'otmetki.hud.hangar_marks': ('hangar_left', 0),
    'otmetki.session': ('hangar_left', 1),
    'otmetki.crew_xp': ('hangar_left', 2),
    'otmetki.personal_missions': ('hangar_right', 0),
    'otmetki.comp7_helper': ('hangar_right', 1),
    'otmetki.event_trackers.triathlon': ('hangar_right', 2),
    'otmetki.event_trackers.caravan': ('hangar_right', 3),
}
# Panels whose default place follows a stock battle element (docs/research/competitors/2026-10-05-behavior-parity.md,
# the places Battle Observer, Lebwa, PROTanki and kurzdor's battleequipment use): while a panel sits at its default
# place its `attach` prop names the rule, with the measured stock sizes (core.hud.stock.stock_metrics), and the page
# places it from them (ui-web views/hud/lib/attach); the default place itself is where GUIFlash draws it.
# `bar_right`: right of the consumables panel (marks); `bar_left`: left of it (equipment row); `minimap_above`: right
# aligned above the minimap (the previous battle's results); `score_right`: right of the score strip (battle progress).
# A followed stock element the page hides (core.hud.stock FOLLOWED_ALIASES) is sent as 0 px: the marks then sit beside
# the stock post-mortem tips, the previous battle's card drops to the corner. The score strip is never measured
# (`score_right` follows the screen centre, where team HP draws its replacement), so nothing there can go stale.
ATTACH_KINDS = ('bar_right', 'bar_left', 'minimap_above', 'score_right')
ATTACHED = {
    'otmetki.hud.marks_panel': 'bar_right',
    'otmetki.hud.battle_loadout': 'bar_left',
    'otmetki.hud.last_battle': 'minimap_above',
    'otmetki.hud.battle_progress': 'score_right',
}
# Panels shown only while the stock component they sit beside is on the screen (core.hud.stock FOLLOWED_ALIASES): the
# equipment row goes with the consumables panel on death, in the video camera and under the pre-battle setups panel, as
# kurzdor's battleequipment does (CHANGELOG 3.5.0, 3.10.00). The marks stay after death, as the gunmarks packs keep
# theirs: the bar's 0 px size moves them beside the post-mortem tips instead (ui-web views/hud/lib/attach).
FOLLOWS = {
    'otmetki.hud.battle_loadout': CONSUMABLES_PANEL,
}

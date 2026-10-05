# -*- coding: utf-8 -*-
import importlib
import io
import os
import re
import unittest

import _support  # noqa: F401
from otmetki.core.hud.panel import ATTACHED, DOCK_ANCHORS
from otmetki.core.settings import Settings

# Every battle screen the client allows, as (width, height, interface scale): gui/shared/utils/graphics.py _SCALES.
SCREENS = (
    (1920, 1080, 1.0),
    (2560, 1440, 1.0),
    (2560, 1440, 1.25),
    (2560, 1440, 1.5),
    (3840, 2160, 1.0),
    (3840, 2160, 1.25),
    (3840, 2160, 1.5),
    (3840, 2160, 1.75),
    (3840, 2160, 2.0),
)
# The size a panel is checked at: the widest card the HUD page draws, two text lines high; the team HP numbers beside
# the stock strip at their default font size.
PANEL_SIZE = (260, 40)
TEAM_HP_NUMBERS_SIZE = (180, 40)
# Stock boxes in the middle of the top edge (RU 1.45 gui_battle AS3), design px as (half width off the centre, top,
# bottom). The score strip: HP bars of 234 px from 109 px off the centre (BaseTeamHealthBar.as), vehicle markers down
# to about 60. The capture bars: two of 34 px from y 62 (TeamBasesPanel.as, EpicBattlePage.as). The quest progress:
# from the bases' top + 45 plus their height (BattlePage.updatePositionForQuestProgress), items 60 px apart
# (QuestProgressTopViewItemsPos.as).
SCORE_STRIP = (345, 0, 60)
CAPTURE_BARS = (200, 62, 130)
QUEST_PROGRESS = (200, 107, 245)
# The stock timer at the top right (battleTimer, 184 px) and the battle clock left of it.
TIMER_WIDTH = 184
BATTLE_CLOCK_WIDTH = 90
BATTLE_PANELS = (
    'battle_hotkeys', 'battle_loadout', 'battle_progress', 'damage_log', 'gun_arc', 'marks_panel', 'platoon_points',
    'sixth_sense',
)
# The page's places of the attached panels (ui-web views/hud/lib/attach, HUD_OVERLAY.attach), design px: the gap to
# the stock element, the bottom margin, the consumables panel's height, the gap over it and the gap between the two
# halves above it, the battle log's right edge, the gap over the minimap, and the place right of the score strip
# (under it below 1700 px).
ATTACH_GAP = 12
ATTACH_EDGE = 8
BAR_HEIGHT = 58
BAR_ABOVE = 6
BAR_SPLIT = 6
LOG_RIGHT = 507
MINIMAP_GAP = 12
SCORE_OFFSET = 308
SCORE_TOP = 4
SCORE_NARROW = 1700
SCORE_UNDER = 52


PAGE_CONSTANTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'ui-web', 'src', 'views', 'hud', 'config', 'hud-overlay.constants.ts',
)


def read_page_constants():
    with io.open(PAGE_CONSTANTS, encoding='utf-8') as handle:
        text = handle.read()
    block = text[text.index('attach:'):]
    block = block[:block.index('\n  }')]
    return dict((key, int(value)) for key, value in re.findall(r'(\w+): (\d+)', block))


def design_screen(width, height, scale):
    return width / scale, height / scale


def offset(align, size, extent):
    if align in ('left', 'top'):
        return 0
    if align == 'center':
        return (extent - size) / 2
    return extent - size


def panel_rect(place, screen, size=PANEL_SIZE):
    width, height = size
    left = offset(place['align_x'], width, screen[0]) + place['x']
    top = offset(place['align_y'], height, screen[1]) + place['y']
    return left, top, left + width, top + height


def centre_box(box, screen):
    half_width, top, bottom = box
    centre = screen[0] / 2
    return centre - half_width, top, centre + half_width, bottom


def overlaps(first, second):
    horizontally = first[0] < second[2] and second[0] < first[2]
    vertically = first[1] < second[3] and second[1] < first[3]
    return horizontally and vertically


def default_place(feature_id):
    settings = importlib.import_module('otmetki.features.%s.settings' % feature_id)
    return settings.SCHEMA.defaults


def battle_places():
    places = dict((feature_id, default_place(feature_id)) for feature_id in BATTLE_PANELS)
    for group, anchor in DOCK_ANCHORS.items():
        if group.startswith('battle_'):
            places['dock:' + group] = anchor
    return places


def team_hp_beside_stock():
    from otmetki.features.team_hp.model import pinned_place
    from otmetki.features.team_hp.settings import SCHEMA

    settings = Settings({'style': 'numbers'}, SCHEMA)
    x, y = pinned_place(settings, True)
    return {'x': x, 'y': y, 'align_x': 'center', 'align_y': 'top'}


def team_hp_rect(place, screen):
    return panel_rect(place, design_screen(*screen), TEAM_HP_NUMBERS_SIZE)


def covers(rect, box, screen):
    """Whether a panel at `rect` on `screen` (as listed in SCREENS) overlaps the stock `box`."""
    return overlaps(rect, centre_box(box, design_screen(*screen)))


def clock_left_edge(screen):
    return design_screen(*screen)[0] - TIMER_WIDTH - BATTLE_CLOCK_WIDTH


class StockBoxesTest(unittest.TestCase):

    def test_no_default_battle_place_covers_the_capture_bars_or_the_quest_progress(self):
        stock = (CAPTURE_BARS, QUEST_PROGRESS)

        covered = [
            (name, screen)
            for screen in SCREENS
            for name, place in sorted(battle_places().items())
            for box in stock
            if covers(panel_rect(place, design_screen(*screen)), box, screen)
        ]

        assert covered == []

    def test_team_hp_beside_the_stock_strip_covers_no_stock_box(self):
        stock = (SCORE_STRIP, CAPTURE_BARS, QUEST_PROGRESS)
        place = team_hp_beside_stock()

        covered = [screen for screen in SCREENS for box in stock if covers(team_hp_rect(place, screen), box, screen)]

        assert covered == []

    def test_team_hp_beside_the_stock_strip_stays_left_of_the_clock_and_the_timer(self):
        place = team_hp_beside_stock()

        crowded = [screen for screen in SCREENS if team_hp_rect(place, screen)[2] > clock_left_edge(screen)]

        assert crowded == []


# The stock random-battle HUD (RU 1.45 gui_battle AS3), design px at scale 1, as (name, rect(W, H)) with rect =
# (left, top, right, bottom). What the AS3 leaves to the Flash timeline was measured on a 3840x2160 screenshot at
# interface scale 1.75: the damage panel 230 x 230, the team lists from y 65, the timer 184 x 44.
DAMAGE_PANEL_HEIGHT = 230
PLAYERS_TOP = 65
PLAYERS_BOTTOM = PLAYERS_TOP + 15 * 25
PLAYERS_WIDTH = 339
MINIMAP_DEFAULT = 260
MINIMAP_LARGEST = 610
MINIMAPS = (MINIMAP_DEFAULT, MINIMAP_LARGEST)
CONSUMABLES_WIDTH = 9 * 57


def ribbons_top(height):
    return height / 2 + 150 + (height / 2 - 356) // 2


STOCK_RECTS = (
    # BaseBattlePage.updateStage: x 0, y = H - initedHeight; DamagePanel.PANEL_WIDTH 230.
    ('damage panel', lambda w, h: (0, h - DAMAGE_PANEL_HEIGHT, 230, h)),
    # BattleMessenger: the 230 x 48 input strip right above the damage panel.
    ('chat input', lambda w, h: (0, h - DAMAGE_PANEL_HEIGHT - 48, 230, h - DAMAGE_PANEL_HEIGHT)),
    # ConsumablesPanel: 57 px per slot, 9 slots, centred, y = H - 58.
    ('consumables', lambda w, h: ((w - CONSUMABLES_WIDTH) / 2, h - 58, (w + CONSUMABLES_WIDTH) / 2, h)),
    # BaseBattlePage.VEHICLE_MESSAGES_LIST_OFFSET (500, 111): two lines growing up from H - 111.
    ('vehicle messages', lambda w, h: ((w - 500) / 2, h - 159, (w + 500) / 2, h - 111)),
    # PLAYER_MESSAGES_LIST_OFFSET (350, -38): 30 lines of 20 px growing up from 38 px above the minimap.
    ('player messages', lambda w, h: (w - 350, h - MINIMAP_DEFAULT - 638, w, h - MINIMAP_DEFAULT - 38)),
    # PlayersPanel: 15 rows of 25 px, at most 339 wide in the full mode.
    ('left team list', lambda w, h: (0, PLAYERS_TOP, PLAYERS_WIDTH, PLAYERS_BOTTOM)),
    ('right team list', lambda w, h: (w - PLAYERS_WIDTH, PLAYERS_TOP, w, PLAYERS_BOTTOM)),
    ('score strip', lambda w, h: (w / 2 - SCORE_STRIP[0], 0, w / 2 + SCORE_STRIP[0], SCORE_STRIP[2])),
    ('capture bars', lambda w, h: (w / 2 - CAPTURE_BARS[0], CAPTURE_BARS[1], w / 2 + CAPTURE_BARS[0], CAPTURE_BARS[2])),
    ('quest progress', lambda w, h: (w / 2 - QUEST_PROGRESS[0], QUEST_PROGRESS[1], w / 2 + QUEST_PROGRESS[0],
                                     QUEST_PROGRESS[2])),
    # battleTimer: x = W - initedWidth, y 0.
    ('battle timer', lambda w, h: (w - TIMER_WIDTH, 0, w, 44)),
    # VEHICLE_ERRORS_LIST_OFFSET (300, 30): three lines growing up from H / 4 + 30.
    ('vehicle errors', lambda w, h: ((w - 300) / 2, h / 4 - 42, (w + 300) / 2, h / 4 + 30)),
    # RibbonsPanel: three 30 px rows from W/2 - 156 (RIBBONS_CENTER_SCREEN_OFFSET_Y 150, MIN_BOTTOM_PADDING_Y 116).
    ('ribbons', lambda w, h: (w / 2 - 156, ribbons_top(h), w / 2 + 156, ribbons_top(h) + 90)),
)
# Left out on purpose: the stock damage log, the score strip and the sixth sense lamp (damage_log, team_hp and
# sixth_sense replace and hide them); the perks panel (a few 30 px icons at H - 115 while a crew perk works), the damage
# info and destroy timers under the reticle and the consumables popup (H - 110): they show for a moment.
HUD_RESOLUTIONS = ((1920, 1080), (2560, 1440))
# The largest default size of each panel (design px); a docked column is one box from its anchor to its reserve. The
# traverse limit markers (gun_arc) follow the reticle, at its height across the width of their canvas, and have no
# size here.
PANEL_SIZES = {
    'battle_clock': (90, 24),
    'battle_hotkeys': (300, 30),
    'battle_loadout': (300, 44),
    'sixth_sense': (48, 48),
    'marks_panel': (260, 44),
    'battle_progress': (260, 80),
    'last_battle': (260, 110),
}
COLUMN_WIDTH = 340
DAMAGE_LOG_SIZE = (330, 260)
DOCKED = (
    ('platoon_points', 'battle_left_top'),
    ('damage_log', 'battle_left_bottom'),
)
# (panel, stock element) pairs a default place may share: the previous battle's card sits where the packs put their
# results notice, over the stock player messages above the minimap (a few lines that show for a moment); battle
# progress sits right of our team HP strip, which replaces the stock score strip (its vehicle icons reach 345 px off
# the centre), as Battle Observer places its main gun beside its own strip.
SHARED = (('last_battle', 'player messages'), ('battle_progress', 'score strip'))
# The same with the largest minimap: at 1080 px it ends 18 px under the right team list, so the card over it meets the
# list's last rows for its few seconds; there is no other place above the minimap.
SHARED_LARGEST = (('last_battle', 'right team list'),)
# Our team HP strip (team_hp, 600 px wide, centred at the top): half its width and its height.
TEAM_HP_STRIP = (300, 0, 44)


# The hangar: the «Clock and server» strip (hangar_info, free) at its widest with every part on, and the docked columns.
HANGAR_INFO_SIZE = (480, 30)
HANGAR_COLUMNS = ('hangar_left', 'hangar_right')


def place_of(values):
    return tuple(values[key] for key in ('x', 'y', 'align_x', 'align_y'))


def top_column(anchor, screen):
    width, height = screen
    left = anchor['x'] if anchor['align_x'] == 'left' else width + anchor['x'] - COLUMN_WIDTH
    return left, anchor['y'], left + COLUMN_WIDTH, height - anchor['reserve']


def bottom_column(anchor, screen):
    width, height = DAMAGE_LOG_SIZE
    bottom = screen[1] + anchor['y']
    return anchor['x'], bottom - height, anchor['x'] + width, bottom


def clock_place():
    from otmetki.features.hangar_info.settings import CLOCK_SCHEMA

    return CLOCK_SCHEMA.defaults


def sized(left, top, size):
    return left, top, left + size[0], top + size[1]


def beside_bar(kind, size, screen, minimap, bar):
    width, height = screen
    if kind == 'bar_right':
        left = width / 2 + bar / 2 + ATTACH_GAP
        lifted = left + size[0] > width - minimap - ATTACH_EDGE
        lifted_left = width / 2 + BAR_SPLIT
    else:
        left = width / 2 - bar / 2 - ATTACH_GAP - size[0]
        lifted = left < LOG_RIGHT
        lifted_left = width / 2 - BAR_SPLIT - size[0]
    if lifted:
        return sized(lifted_left, height - BAR_HEIGHT - BAR_ABOVE - size[1], size)
    return sized(left, height - ATTACH_EDGE - size[1], size)


def attached_rect(kind, size, screen, minimap, bar=CONSUMABLES_WIDTH):
    width, height = screen
    if kind in ('bar_right', 'bar_left'):
        return beside_bar(kind, size, screen, minimap, bar)
    if kind == 'minimap_above':
        return sized(width - ATTACH_EDGE - size[0], height - minimap - MINIMAP_GAP - size[1], size)
    if width < SCORE_NARROW:
        return sized((width - size[0]) / 2, SCORE_UNDER, size)
    return sized(width / 2 + SCORE_OFFSET, SCORE_TOP, size)


def attached_rects(screen, minimap):
    rects = {}
    for alias, kind in ATTACHED.items():
        panel = alias.split('.')[-1]
        rects[panel] = attached_rect(kind, PANEL_SIZES[panel], screen, minimap)
    return rects


def default_rects(screen, minimap=MINIMAP_DEFAULT):
    rects = {
        'team_hp': centre_box(TEAM_HP_STRIP, screen),
        'battle_clock': panel_rect(clock_place(), screen, PANEL_SIZES['battle_clock']),
        'platoon_points': top_column(DOCK_ANCHORS['battle_left_top'], screen),
        'damage_log': bottom_column(DOCK_ANCHORS['battle_left_bottom'], screen),
    }
    for feature_id in ('battle_hotkeys', 'sixth_sense'):
        rects[feature_id] = panel_rect(default_place(feature_id), screen, PANEL_SIZES[feature_id])
    rects.update(attached_rects(screen, minimap))
    return rects


def hangar_rects(screen):
    from otmetki.features.hangar_info.settings import SCHEMA

    rects = dict((group, top_column(DOCK_ANCHORS[group], screen)) for group in HANGAR_COLUMNS)
    rects['hangar_info'] = panel_rect(SCHEMA.defaults, screen, HANGAR_INFO_SIZE)
    return rects


def stock_rects(screen, minimap=MINIMAP_DEFAULT):
    width, height = screen
    # MinimapSizeConst.MAP_SIZE: the square at the bottom right, by the player's size setting.
    minimap_rect = (width - minimap, height - minimap, width, height)
    return [(name, rect(*screen)) for name, rect in STOCK_RECTS] + [('minimap', minimap_rect)]


def replaced(panel, stock, minimap=MINIMAP_DEFAULT):
    shared = SHARED + (SHARED_LARGEST if minimap == MINIMAP_LARGEST else ())
    return (panel == 'team_hp' and stock == 'score strip') or (panel, stock) in shared


class DefaultPlacesTest(unittest.TestCase):

    def test_every_docked_panel_starts_at_its_column_anchor(self):
        wrong = [
            feature_id for feature_id, group in DOCKED
            if place_of(default_place(feature_id)) != place_of(DOCK_ANCHORS[group])
        ]

        assert wrong == []

    def test_no_default_panel_covers_a_stock_element(self):
        covered = [
            (screen, minimap, panel, stock)
            for screen in HUD_RESOLUTIONS
            for minimap in MINIMAPS
            for panel, rect in sorted(default_rects(screen, minimap).items())
            for stock, box in stock_rects(screen, minimap)
            if not replaced(panel, stock, minimap) and overlaps(rect, box)
        ]

        assert covered == []

    def test_no_two_default_panels_overlap(self):
        crowded = []
        for screen, minimap in [(screen, minimap) for screen in HUD_RESOLUTIONS for minimap in MINIMAPS]:
            rects = sorted(default_rects(screen, minimap).items())
            crowded += [
                (screen, minimap, first[0], second[0])
                for index, first in enumerate(rects)
                for second in rects[index + 1:]
                if overlaps(first[1], second[1])
            ]

        assert crowded == []

    def test_no_two_default_hangar_panels_overlap(self):
        crowded = []
        for screen in SCREENS:
            rects = sorted(hangar_rects(design_screen(*screen)[:2]).items())
            crowded += [
                (screen, first[0], second[0])
                for index, first in enumerate(rects)
                for second in rects[index + 1:]
                if overlaps(first[1], second[1])
            ]

        assert crowded == []

    def test_the_equipment_row_sits_beside_the_consumables_or_above_them(self):
        screen = (2560, 1440)
        beside = attached_rect('bar_left', PANEL_SIZES['battle_loadout'], screen, MINIMAP_DEFAULT, 7 * 57)
        lifted = attached_rect('bar_left', PANEL_SIZES['battle_loadout'], (1920, 1080), MINIMAP_DEFAULT)
        consumables = dict(stock_rects((1920, 1080)))['consumables']

        assert (beside[2], beside[3]) == (screen[0] / 2 - 7 * 57 / 2 - ATTACH_GAP, screen[1] - ATTACH_EDGE)
        assert consumables[1] - lifted[3] >= 6

    def test_the_marks_end_left_of_the_minimap(self):
        crowded = [
            (screen, minimap)
            for screen in HUD_RESOLUTIONS
            for minimap in MINIMAPS
            if default_rects(screen, minimap)['marks_panel'][2] > screen[0] - minimap - ATTACH_EDGE
        ]

        assert crowded == []

    def test_the_attached_places_are_the_page_constants(self):
        page = read_page_constants()

        expected = {
            'gap': ATTACH_GAP, 'edge': ATTACH_EDGE, 'height': BAR_HEIGHT, 'above': BAR_ABOVE, 'split': BAR_SPLIT,
            'right': LOG_RIGHT, 'offset': SCORE_OFFSET, 'top': SCORE_TOP, 'narrow': SCORE_NARROW, 'under': SCORE_UNDER,
        }
        assert dict((key, page.get(key)) for key in expected) == expected


if __name__ == '__main__':
    unittest.main()

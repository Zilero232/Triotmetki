# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import unittest

import _support
from otmetki.core.storage import MemoryFile
from otmetki.features.marks_panel.i18n import STRINGS
from otmetki.features.marks_panel.model.history import MarksHistory
from otmetki.features.marks_panel.model.page import build_page
from otmetki.features.marks_panel.model.report import marks_report, nation_of

T0 = 1790000000
T34 = 1 | (0 << 4) | (4 << 8)
TIGER = 1 | (1 << 4) | (20 << 8)
REPORT_FIXTURE = os.path.join(
    _support.MODPACK_DIR,
    'ui-web',
    'src',
    'shared',
    'api',
    'protocol',
    '_tests',
    'fixtures',
    'marks-report.sample.json',
)
RATINGS = (8012, 8100, 8075, 8230, 8410, 8395, 8520)
DAMAGES = (1800, 2600, 1500, 3100, 4200, 2000, 3500)


def battle(arena, rating, tank_id=TIGER, damage=2000, occurred=T0, marks=2):
    return {
        'arena_unique_id': str(arena),
        'occurred_at': occurred + arena,
        'result': 'win',
        'bonus_type': 1,
        'vehicle': {'tank_id': tank_id, 'name': 'germany:G04_PzVI_Tiger_I', 'tier': 7},
        'stats': {'damage_dealt': damage, 'damage_assisted_radio': 300, 'damage_assisted_track': 0},
        'moe': {'damage_rating': rating, 'moving_avg_damage': 2400, 'marks_on_gun': marks},
    }


def filled():
    history = MarksHistory(MemoryFile(), max_entries=100)
    for index, (rating, damage) in enumerate(zip(RATINGS, DAMAGES)):
        history.record_battle(battle(index + 1, rating, damage=damage), u'Tiger I', 'heavyTank')
    return history


def tiger_report():
    return marks_report(TIGER, filled().vehicle(TIGER))


class NationTest(unittest.TestCase):

    def test_nation_from_the_compact_descriptor(self):
        assert nation_of(T34) == 'ussr'
        assert nation_of(TIGER) == 'germany'

    def test_no_nation_without_a_descriptor(self):
        assert nation_of(None) is None


class MarksReportTest(unittest.TestCase):

    def test_header_names_the_tank_with_its_icons(self):
        report = tiger_report()

        assert report['name'] == u'Tiger I'
        assert report['tier'] == 7
        assert report['flag'] == 'img://gui/maps/icons/flags/25x17/germany.png'
        assert report['cls'].startswith('img://gui/maps/icons/vehicleTypes/white/heavyTank.png')
        assert report['tier_icon'] == 'img://gui/maps/icons/levels/tank_level_small_7.png'

    def test_cards_show_the_percent_marks_and_record(self):
        report = tiger_report()

        assert report['percent'] == 85.2
        assert report['marks'] == 2
        assert report['record'] == 85.2

    def test_last_battle_card(self):
        assert tiger_report()['last'] == {'t': T0 + 7, 'damage': 3800, 'percent': 85.2, 'delta': 1.25, 'result': 'win'}

    def test_best_battle_is_the_highest_combined_damage(self):
        best = tiger_report()['best']

        assert best['damage'] == 4500
        assert best['delta'] == 1.8

    def test_trend_over_the_first_window(self):
        assert tiger_report()['trends'][0] == {'window': 10, 'battles': 6, 'delta': 5.08}

    def test_table_lists_battles_newest_first(self):
        battles = tiger_report()['battles']

        assert [row['delta'] for row in battles][:3] == [1.25, -0.15, 1.8]
        assert battles[-1]['delta'] is None

    def test_chart_lists_every_percent_oldest_first(self):
        assert tiger_report()['chart'] == [80.12, 81.0, 80.75, 82.3, 84.1, 83.95, 85.2]

    def test_no_report_without_entries(self):
        assert marks_report(TIGER, {'entries': []}) is None


class PageReportTest(unittest.TestCase):

    def test_page_rows_carry_the_report(self):
        page = build_page(filled(), _support.translator(STRINGS, 'ru'), 5, 10)

        assert page['rows'][0]['report']['name'] == u'Tiger I'

    def test_the_report_matches_the_ui_fixture(self):
        page = build_page(filled(), _support.translator(STRINGS, 'ru'), 5, 10)
        payload = page['rows'][0]['report']
        if os.environ.get('OTMETKI_UPDATE_FIXTURES') == '1':
            _support.write_fixture(REPORT_FIXTURE, payload)

        with io.open(REPORT_FIXTURE, encoding='utf-8') as handle:
            fixture = json.load(handle)

        assert fixture == json.loads(json.dumps(payload))


class BattleStartTest(unittest.TestCase):

    def after_a_refreshed_hangar_read(self):
        history = MarksHistory(MemoryFile(), max_entries=100)
        snapshot = {'tank_id': TIGER, 'damage_rating': 8400, 'moving_avg_damage': 2400, 'marks_on_gun': 2}
        history.record_snapshot(snapshot, T0)
        history.record_snapshot(dict(snapshot, damage_rating=8520, moving_avg_damage=2450), T0 + 5)
        history.record_battle(battle(1, 8520), before=8400)
        return history

    def test_the_last_battle_counts_from_the_dossier_read_before_it(self):
        report = marks_report(TIGER, self.after_a_refreshed_hangar_read().vehicle(TIGER))

        assert report['last']['delta'] == 1.2

    def test_the_history_line_counts_from_the_dossier_read_before_it(self):
        page = build_page(self.after_a_refreshed_hangar_read(), _support.translator(STRINGS, 'en'), 5, 10)

        assert u'(+1.20%)' in page['rows'][0]['details'][0]['value']


if __name__ == '__main__':
    unittest.main()

# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support
from otmetki.core.settings import Settings
from otmetki.features.damage_log.i18n import STRINGS
from otmetki.features.damage_log.model import DamageLog, Hit
from otmetki.features.damage_log.model.preview import preview_log, preview_widget
from otmetki.features.damage_log.model.widget import damage_log_widget
from otmetki.features.damage_log.settings import SCHEMA

TRANSLATE = _support.translator(STRINGS)
EN = _support.translator(STRINGS, 'en')
KV = 17
T34 = 18


def settings(**values):
    return Settings(values, SCHEMA)


def data_of(log, translate=TRANSLATE, **values):
    return damage_log_widget(log, settings(**values), translate)['data']


def preview_data(**values):
    return data_of(preview_log(), **values)


def fire_and_ram_log():
    log = DamageLog()
    log.add('damage', 30, Hit(vehicle_id=T34, vehicle='T-34', source='fire', at=1.0))
    log.add('received', 50, Hit(vehicle_id=KV, vehicle='KV-1', source='ram', at=2.0))
    return log


def gold_he_log():
    log = DamageLog()
    log.add('received', 390, Hit(vehicle_id=KV, vehicle='KV-1', shell='he', gold=True, at=1.0))
    return log


class TotalsTest(unittest.TestCase):

    def test_totals_are_keyed_in_order(self):
        keys = [item['key'] for item in preview_data()['totals']]

        assert keys == ['dealt', 'assist', 'blocked', 'received']

    def test_a_total_is_an_icon_a_number_and_a_tone(self):
        assert preview_data()['totals'][0] == {
            'key': 'dealt',
            'icon': 'img://gui/maps/icons/library/efficiency/48x48/damage.png|otmetki:damage',
            'value': 710,
            'tone': 'accent',
        }

    def test_the_received_total_takes_our_glyph(self):
        assert preview_data()['totals'][-1]['icon'] == 'otmetki:received'


class DealtRowsTest(unittest.TestCase):

    def test_a_shot_row_carries_the_outcome_shell_class_and_hp(self):
        pz = preview_data()['dealt'][-1]

        assert pz['amount'] == 390
        assert pz['tone'] == 'accent'
        assert pz['icon'] == 'otmetki:damage'
        assert pz['shell'] == {'code': 'ap', 'label': u'ББ', 'gold': False}
        assert pz['cls'].startswith('img://gui/maps/icons/vehicleTypes/red/mediumTank.png')
        assert pz['hp'] == 510
        assert pz['max'] == 900

    def test_a_crit_row_takes_the_crit_marker_and_a_gold_shell(self):
        crit = preview_data()['dealt'][1]

        assert crit['icon'].startswith('img://gui/maps/icons/library/critical_damage/hit_critical.png')
        assert crit['shell']['gold']

    def test_a_row_counts_the_crits_of_the_own_shots(self):
        rows = preview_data()['dealt']

        assert [row['crits'] for row in rows] == [0, 1, 0, 0]

    def test_grouped_ricochets_count_their_hits_without_an_amount(self):
        ricochets = preview_data()['dealt'][2]

        assert ricochets['hits'] == 2
        assert ricochets['amount'] is None
        assert ricochets['icon'].startswith('img://gui/maps/icons/library/critical_damage/hit_ricochet.png')

    def test_an_assist_row_takes_its_glyph_and_the_targets_class(self):
        assist = preview_data()['dealt'][0]

        assert assist['icon'] == 'otmetki:radio'
        assert assist['tone'] == 'radio'
        assert assist['cls'].startswith('img://gui/maps/icons/vehicleTypes/red/heavyTank.png')

    def test_fire_damage_takes_the_fire_icon_and_no_shell(self):
        fire = data_of(fire_and_ram_log())['dealt'][0]

        assert fire['icon'].startswith('img://gui/maps/icons/library/efficiency/48x48/fire.png')
        assert fire['shell'] is None

    def test_the_hp_can_be_left_out(self):
        pz = preview_data(show_hp=False)['dealt'][-1]

        assert pz['hp'] is None
        assert pz['max'] is None


class ReceivedRowsTest(unittest.TestCase):

    def test_damage_to_the_player_is_negative_with_the_ammo_rack(self):
        kv = preview_data()['received'][0]

        assert kv['amount'] == -310
        assert kv['tone'] == 'received'
        assert kv['icon'] == 'otmetki:received'
        assert kv['ammo_rack'] == 'otmetki:ammo_rack'
        assert kv['crits'] == 0

    def test_a_blocked_hit_keeps_its_amount_in_the_blocked_tone(self):
        blocked = preview_data()['received'][1]

        assert blocked['amount'] == 240
        assert blocked['tone'] == 'blocked'
        assert blocked['icon'].startswith('img://gui/maps/icons/library/critical_damage/hit_blocked.png')

    def test_a_ram_takes_the_ram_icon(self):
        ram = data_of(fire_and_ram_log())['received'][0]

        assert ram['icon'].startswith('img://gui/maps/icons/library/efficiency/48x48/ram.png')

    def test_a_premium_he_shell_has_its_own_label(self):
        shell = data_of(gold_he_log())['received'][0]['shell']

        assert shell == {'code': 'he', 'label': u'ОФ-П', 'gold': True}

    def test_the_shell_label_follows_the_language(self):
        shell = data_of(gold_he_log(), translate=EN)['received'][0]['shell']

        assert shell['label'] == 'HE'


class DetailTest(unittest.TestCase):

    def test_the_notes_widen_the_log_by_default(self):
        data = preview_data()

        assert data['wide']
        assert data['received'][1]['note'] == u'не пробил'
        assert data['dealt'][2]['note'] == u'рикошет'

    def test_the_notes_leave_out_what_the_icons_and_the_bar_show(self):
        data = preview_data()

        assert data['received'][0]['note'] == ''
        assert data['dealt'][1]['note'] == ''
        assert data['dealt'][1]['crits'] == 1
        assert data['dealt'][1]['hp'] == 1180

    def test_the_notes_setting_keeps_the_rows_short(self):
        data = preview_data(show_notes=False)

        assert not data['wide']
        assert [row['note'] for row in data['dealt'] + data['received']] == [''] * 6

    def test_the_compact_style_has_no_rows(self):
        data = preview_data(style='compact')

        assert data['dealt'] == []
        assert data['received'] == []

    def test_the_edit_preview_follows_the_notes_setting(self):
        assert not preview_widget(settings(show_notes=False), TRANSLATE)['data']['wide']

    def test_damage_log_fixture_for_the_page(self):
        assert _support.widget_fixture('damage_log', preview_widget(settings(), TRANSLATE))


if __name__ == '__main__':
    unittest.main()

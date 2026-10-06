# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import unittest

import _feedback as fb
import _support
from otmetki.core.battle_tally import EFFICIENCY_KEYS, efficiency_totals
from otmetki.core.client.game import values_by_name
from otmetki.core.settings import Settings
from otmetki.features.damage_log.i18n import STRINGS
from otmetki.features.damage_log.model import DamageLog, Hit, dealt_rows, received_rows, section_rows, shown_totals
from otmetki.core.hud.icons import CLASS_GLYPHS
from otmetki.features.damage_log.model.constants import KINDS, PALETTES
from otmetki.features.damage_log.model.preview import preview_log, preview_text
from otmetki.features.damage_log.model.text import class_icon, format_damage_log, kind_color, kind_icon
from otmetki.features.damage_log.settings import SCHEMA, SETTINGS, SWITCH

TIGER = 202
IS = 303
KV = 17


def translator(language='ru'):
    return _support.translator(STRINGS, language)


def settings(**values):
    return Settings(values, SCHEMA)


def target(vehicle_id, name, at, **details):
    return Hit(vehicle_id=vehicle_id, vehicle=name, at=at, **details)


def filled_log():
    log = DamageLog()
    log.add('damage', 390, target(TIGER, 'Tiger', 1.0, shell='ap'))
    log.add('damage', 410.6, target(IS, 'IS', 5.0, shell='heat'))
    log.add('radio', 120, target(TIGER, 'Tiger', 6.0))
    log.add('track', 80, target(TIGER, 'Tiger', 7.0))
    log.add('stun', 40, target(IS, 'IS', 8.0))
    log.add('blocked', 240, target(KV, 'KV-1', 9.0, shell='ap'))
    log.add('received', 310, target(KV, 'KV-1', 20.0, shell='he'))
    return log


def efficiency_of(damage, assist, blocked, stun):
    types = fb.PERSONAL_EFFICIENCY_TYPE
    totals = {types.DAMAGE: damage, types.ASSIST_DAMAGE: assist, types.BLOCKED_DAMAGE: blocked, types.STUN: stun}
    return efficiency_totals(totals, values_by_name(types, EFFICIENCY_KEYS))


def shipped_icons():
    assets = os.path.join(_support.MODPACK_DIR, 'assets')
    with io.open(os.path.join(assets, 'assets.json'), encoding='utf-8') as handle:
        sets = [item for item in json.load(handle)['sets'] if item['feature'] == 'damage_log']

    shipped = set()
    for item in sets:
        folder = item['target'][len('res/'):]
        for name in os.listdir(os.path.join(assets, *item['files'].split('/'))):
            shipped.add(folder + '/' + name)
    return shipped


def icon_path(markup):
    return markup.split('img://')[1].split('"')[0]


class TotalsTest(unittest.TestCase):

    def test_totals_sum_the_events(self):
        values = filled_log().values()

        assert values == {
            'dealt': 800,
            'blocked': 240,
            'assist': 200,
            'stun': 40,
            'assisted': 240,
            'assist_radio': 120,
            'assist_track': 80,
            'assist_stun': 40,
            'received': 310,
            'hits': 2,
            'blocked_hits': 1,
            'received_hits': 1,
        }

    def test_vanilla_efficiency_totals_are_a_floor(self):
        log = filled_log()
        picked = efficiency_of(damage=1250, assist=600, blocked=100, stun=40)

        changed = log.apply_summary(
            picked.get('dealt'),
            picked.get('assist'),
            picked.get('blocked'),
            picked.get('stun'),
        )

        values = log.values()
        assert changed
        assert values['dealt'] == 1250
        assert values['blocked'] == 240
        assert values['assist'] == 600

    def test_summary_event_totals_raise_the_values(self):
        log = DamageLog()
        summary = fb.BattleSummaryFeedbackEvent(
            damage=900,
            trackAssist=100,
            radioAssist=200,
            tankings=300,
            stunAssist=50,
        )

        log.apply_summary(
            summary.getTotalDamage(),
            summary.getTotalAssistDamage(),
            summary.getTotalBlockedDamage(),
            summary.getTotalStunDamage(),
        )

        values = log.values()
        assert values['dealt'] == 900
        assert values['assisted'] == 350
        assert values['blocked'] == 300

    def test_a_summary_without_numbers_changes_nothing(self):
        assert not filled_log().apply_summary(None, None, None, None)

    def test_the_same_summary_again_changes_nothing(self):
        log = filled_log()
        log.apply_summary(damage=2150, assist=950, blocked=100, stun=None)

        assert not log.apply_summary(damage=2150, assist=950, blocked=100)

    def test_rejects_an_unknown_kind(self):
        assert not DamageLog().add('unknown', 10)

    def test_rejects_a_zero_amount(self):
        assert not DamageLog().add('damage', 0, target(TIGER, 'Tiger', 1.0))

    def test_rejects_an_amount_that_is_not_a_number(self):
        assert not DamageLog().add('damage', 'x', target(TIGER, 'Tiger', 1.0))

    def test_damage_without_a_target_is_not_counted(self):
        log = DamageLog()

        log.add('damage', 100)

        assert log.values()['dealt'] == 0

    def test_a_summary_counts_the_dealt_total(self):
        log = DamageLog()

        log.apply_summary(damage=100)

        assert log.values()['dealt'] == 100

    def test_zero_totals_are_hidden(self):
        log = DamageLog()
        log.add('damage', 390, target(TIGER, 'Tiger', 1.0))

        assert shown_totals(log, settings()) == [('dealt', 390)]

    def test_an_empty_log_shows_the_dealt_total_at_zero(self):
        assert shown_totals(DamageLog(), settings()) == [('dealt', 0)]

    def test_an_empty_log_of_the_received_section_shows_its_first_total_at_zero(self):
        assert shown_totals(DamageLog(), settings(sections='received')) == [('blocked', 0)]

    def test_the_dealt_section_hides_the_blocked_and_received_totals(self):
        keys = [key for key, _ in shown_totals(filled_log(), settings(sections='dealt'))]

        assert keys == ['dealt', 'assist', 'stun']

    def test_the_received_section_hides_the_dealt_totals(self):
        keys = [key for key, _ in shown_totals(filled_log(), settings(sections='received'))]

        assert keys == ['blocked', 'received']

    def test_the_minimal_style_keeps_the_dealt_and_received_totals(self):
        keys = [key for key, _ in shown_totals(filled_log(), settings(style='minimal'))]

        assert keys == ['dealt', 'received']


class SectionsTest(unittest.TestCase):

    def test_dealt_rows_mix_shots_and_assist_newest_first(self):
        rows = dealt_rows(filled_log(), settings(group_by_target=False))

        assert [row['kind'] for row in rows] == ['stun', 'track', 'radio', 'damage', 'damage']

    def test_dealt_rows_are_capped(self):
        rows = dealt_rows(filled_log(), settings(dealt_lines=2))

        assert len(rows) == 2

    def test_assist_rows_can_be_left_out(self):
        rows = dealt_rows(filled_log(), settings(show_assist_rows=False))

        assert [row['kind'] for row in rows] == ['damage', 'damage']

    def test_grouping_gives_one_row_per_target(self):
        log = DamageLog()
        log.add('damage', 100, target(TIGER, 'Tiger', 1.0))
        log.add('damage', 150, target(TIGER, 'Tiger', 10.0))

        rows = dealt_rows(log, settings())

        assert [(row['hits'], row['damage']) for row in rows] == [(2, 250)]

    def test_without_grouping_every_shot_is_a_row(self):
        log = DamageLog()
        log.add('damage', 100, target(TIGER, 'Tiger', 1.0))
        log.add('damage', 150, target(TIGER, 'Tiger', 10.0))

        rows = dealt_rows(log, settings(group_by_target=False))

        assert [row['damage'] for row in rows] == [150, 100]

    def test_shots_without_damage_can_be_left_out(self):
        log = filled_log()
        log.shots.add_result(TIGER, 'ricochet', 30.0)

        rows = dealt_rows(log, settings(show_misses=False, show_assist_rows=False, group_by_target=False))

        assert [row['outcome'] for row in rows] == ['pen', 'pen']

    def test_shot_rows_take_the_targets_class_and_max_hp(self):
        log = DamageLog()
        log.shots.describe(TIGER, 'heavyTank', 1500)
        log.add('damage', 100, target(TIGER, 'Tiger', 1.0))

        row = dealt_rows(log, settings())[0]

        assert row['class'] == 'heavyTank'
        assert row['max'] == 1500

    def test_received_rows_keep_the_blocked_hits(self):
        rows = received_rows(filled_log(), settings())

        assert [row['kind'] for row in rows] == ['received', 'blocked']

    def test_blocked_hits_on_the_player_can_be_left_out(self):
        rows = received_rows(filled_log(), settings(show_received_blocked=False))

        assert [row['kind'] for row in rows] == ['received']

    def test_a_crit_without_damage_is_a_received_row(self):
        log = DamageLog()
        log.add_crits('received_crit', 1, target(KV, 'KV-1', 3.0))

        rows = received_rows(log, settings(show_received_blocked=False))

        assert [row['outcome'] for row in rows] == ['crit']

    def test_received_rows_are_capped(self):
        rows = received_rows(filled_log(), settings(received_lines=1))

        assert len(rows) == 1

    def test_the_dealt_section_leaves_the_received_rows_out(self):
        rows = section_rows(filled_log(), settings(sections='dealt'))

        assert rows['received'] == []

    def test_the_received_section_leaves_the_dealt_rows_out(self):
        rows = section_rows(filled_log(), settings(sections='received'))

        assert rows['dealt'] == []

    def test_the_compact_style_has_no_rows(self):
        rows = section_rows(filled_log(), settings(style='compact'))

        assert rows == {'dealt': [], 'received': []}


class FormatTest(unittest.TestCase):

    def test_the_first_line_names_the_totals(self):
        lines = format_damage_log(filled_log(), settings(), translator()).split('\n')

        assert u'Урон 800' in lines[0]
        assert u'Получено 310' in lines[0]

    def test_the_rows_follow_the_totals_with_the_received_last(self):
        lines = format_damage_log(filled_log(), settings(), translator()).split('\n')

        assert len(lines) == 8
        assert u'−310 ОФ KV-1' in lines[-2]
        assert u'240 ББ KV-1' in lines[-1]

    def test_the_compact_style_is_one_line_of_numbers(self):
        text = format_damage_log(filled_log(), settings(style='compact'), translator('en'))

        assert text.endswith('>800 / 200 / 40 / 240 / 310</font>')

    def test_palettes_colour_the_totals(self):
        for name, colors in PALETTES.items():
            text = format_damage_log(filled_log(), settings(palette=name, style='compact'), translator())
            full = format_damage_log(filled_log(), settings(palette=name), translator()).split('\n')[0]

            assert colors[0] not in text, name
            assert '<font color="%s">' % colors[0] in full, name

    def test_an_unknown_palette_falls_back_to_graphite(self):
        assert settings(palette='rainbow').get('palette') == 'graphite'

    def test_rows_carry_the_kind_icon(self):
        lines = format_damage_log(filled_log(), settings(), translator()).split('\n')

        icon = '<img src="img://gui/maps/icons/otmetki/damage_log/icons/blocked_32.png" width="14" height="14"/>'
        assert icon in lines[-1]

    def test_a_vehicle_name_with_markup_is_shown_as_text(self):
        log = DamageLog()
        log.add('damage', 390, target(TIGER, '<font color="#000000">Tiger</font>', 1.0, shell='ap'))

        lines = format_damage_log(log, settings(), translator()).split('\n')

        assert '&lt;font color="#000000"&gt;Tiger&lt;/font&gt;' in lines[-1]

    def test_a_custom_totals_template_keeps_its_own_markup(self):
        text = format_damage_log(filled_log(), settings(style='custom', template='<b>{dealt}</b>'), translator())

        assert text.split('\n')[0].endswith('><b>800</b></font>')

    def test_the_kind_icons_and_colours_are_fixed_on(self):
        values = settings(kind_icons=False, kind_colors=False)

        assert (values.get('kind_icons'), values.get('kind_colors')) == (True, True)

    def test_the_retired_keys_leave_the_schema(self):
        assert 'kind_icons' not in SCHEMA.defaults

    def test_every_class_glyph_ships(self):
        shipped = shipped_icons()

        for vehicle_class in CLASS_GLYPHS:
            assert icon_path(class_icon(vehicle_class, 16)) in shipped, vehicle_class

    def test_every_kind_icon_ships(self):
        shipped = shipped_icons()

        for kind in KINDS:
            assert icon_path(kind_icon(kind, 16)) in shipped, kind

    def test_an_unknown_class_has_no_icon(self):
        assert class_icon('warship', 16) == ''

    def test_custom_templates_shape_the_totals_and_the_rows(self):
        custom = settings(
            style='custom',
            template='D={dealt} R={received_hits}',
            sections='dealt',
            dealt_lines=1,
            entry_template='#{index} {amount} {vehicle}',
        )

        text = format_damage_log(filled_log(), custom, translator('en'))

        assert 'D=800 R=1' in text
        assert '#1 40 IS' in text

    def test_the_notes_are_there_by_default(self):
        text = format_damage_log(filled_log(), settings(), translator())

        assert u'оглушение' in text

    def test_the_notes_setting_leaves_the_notes_out(self):
        text = format_damage_log(filled_log(), settings(show_notes=False), translator())

        assert u'оглушение' not in text

    def test_the_alt_template_is_retired(self):
        custom = settings(alt_entry_template='#{index} {vehicle}', sections='received')

        text = format_damage_log(filled_log(), custom, translator())

        assert '#1 KV-1' not in text

    def test_an_old_own_kind_colour_gives_way_to_the_palette(self):
        color = kind_color('received', settings(palette='classic', color_received='#123abc'))

        assert color == PALETTES['classic'][3]

    def test_the_dealt_kind_takes_the_palettes_first_colour(self):
        assert kind_color('damage', settings(palette='classic')) == PALETTES['classic'][0]

    def test_an_ammo_rack_hit_says_so(self):
        log = filled_log()
        log.received.ammo_rack_hit(20.4)

        text = format_damage_log(log, settings(), translator())

        assert u'боеукладка' in text


class SettingsTest(unittest.TestCase):

    def test_the_switch_is_the_only_setting(self):
        assert SETTINGS == (SWITCH,)

    def test_an_unknown_style_falls_back_to_full(self):
        assert settings(style='fancy').get('style') == 'full'

    def test_an_unknown_section_falls_back_to_both(self):
        assert settings(sections='all').get('sections') == 'both'

    def test_dealt_lines_are_capped(self):
        assert settings(dealt_lines=100).get('dealt_lines') == 10

    def test_received_lines_are_capped(self):
        assert settings(received_lines=100).get('received_lines') == 10

    def test_a_long_template_is_cut(self):
        assert len(settings(template='x' * 900).get('template')) == 600

    def test_strings_in_sync(self):
        assert sorted(STRINGS['ru']) == sorted(STRINGS['en'])

    def test_every_choice_has_a_label(self):
        for key in ('style', 'sections', 'palette'):
            for value in SCHEMA.choices[key]:
                assert 'damage_log_%s_%s' % (key, value) in STRINGS['en'], (key, value)

    def test_preview_shows_both_sections(self):
        text = preview_text(settings(), translator('en'))

        assert 'Pz. IV' in text
        assert 'KV-1' in text

    def test_preview_log_has_the_ammo_rack_hit(self):
        rows = received_rows(preview_log(), settings())

        assert rows[0]['ammo_rack']


if __name__ == '__main__':
    unittest.main()

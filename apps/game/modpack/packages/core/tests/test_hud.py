# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re
import unittest

import _support  # noqa: F401
from otmetki.core.events import EventBus
from otmetki.core.hud.modifier import is_held, modifier_keys
from otmetki.core.hud.panel import component_of, moved_values
from otmetki.core.hud import (
    EVENT_DESCRIBE,
    EVENT_EDIT,
    ComponentConfig,
    HudBackend,
    HudLayer,
    HudPreview,
    NullBackend,
    alias_of,
    component_schema,
    hex_color,
    layout_props,
    matching,
    max_length,
    panel_schema,
)
from otmetki.core.templates import format_value, render
from otmetki.core.settings import Settings
from otmetki.core.shells import shell_code, shell_name
from _support import MemoryFile

PREVIEW_TEXT = u'<font color="#FFFFFF">390</font>'
DAMAGE_LOG = alias_of('damage_log')
SESSION = alias_of('session')


class ComponentOfTest(unittest.TestCase):

    def test_a_battle_panel_belongs_to_the_component_of_its_id(self):
        assert component_of('otmetki.hud.damage_log') == 'damage_log'

    def test_a_hangar_label_belongs_to_the_component_before_its_part(self):
        assert component_of('otmetki.event_trackers.caravan') == 'event_trackers'

    def test_the_session_label_belongs_to_the_session_stats(self):
        assert component_of('otmetki.session') == 'session_stats'


class FakeBackend(HudBackend):

    name = 'fake'

    def __init__(self, available=True):
        self.is_available = available
        self.labels = {}
        self.calls = []
        self.on_moved = None

    def available(self):
        return self.is_available

    def create(self, alias, props):
        self.calls.append(('create', alias))
        self.labels[alias] = dict(props)
        return True

    def update(self, alias, props):
        self.calls.append(('update', alias))
        self.labels[alias].update(props)
        return True

    def delete(self, alias):
        self.calls.append(('delete', alias))
        del self.labels[alias]
        return True

    def listen(self, on_moved):
        self.on_moved = on_moved


class ShellMember(object):
    name = 'ARMOR_PIERCING_CR'


SCHEMA = panel_schema(
    {'x': 10, 'style': 'a', 'template': ''},
    choices={'style': ('a', 'b')},
    normalizers={'template': max_length(5)},
)


def coerced_panel_settings():
    return Settings({'x': 99999, 'align_x': 'middle', 'alpha': 50, 'style': 'c', 'template': '1234567'}, SCHEMA)


def lowercase_sound_name():
    return matching(re.compile(r'^[a-z_]*$'), 5)


def store_with_saved_sections():
    return MemoryFile({'damage_log': {'x': 'bad', 'style': 'b'}, 'uninstalled': {'x': 1}, 'broken': 5})


def retiring_schema():
    return panel_schema({'x': 372, 'y': 60, 'align_x': 'left'}, retired=((208, 8, 'left', 'top'),))


def store_with_an_old_and_a_moved_panel():
    return MemoryFile({
        'old': {'x': 208, 'y': 8, 'align_x': 'left', 'align_y': 'top'},
        'moved': {'x': 500, 'y': 8, 'align_x': 'left', 'align_y': 'top'},
    })


def pinned_schema():
    return panel_schema({'y': 0, 'pinned': True}, retired=((0, 58, 'center', 'top'),))


class TemplateTest(unittest.TestCase):

    def test_numbers_are_grouped_by_thousands(self):
        assert render('{dealt} / {blocked}', {'dealt': 2150, 'blocked': 0}) == '2 150 / 0'

    def test_double_braces_open_a_literal(self):
        assert render('{name}: {{literal}}', {'name': 'T-34'}) == 'T-34: {literal}}'

    def test_an_unknown_name_is_left_as_written(self):
        assert render('{typo} {dealt}', {'dealt': 1}) == '{typo} 1'

    def test_none_is_empty_and_true_is_one(self):
        assert render('{a}{b}', {'a': None, 'b': True}) == '1'

    def test_no_template_renders_empty(self):
        assert render(None, {}) == ''

    def test_percent_and_dollar_signs_are_plain_text(self):
        assert render('50% {x} $x ${x}', {'x': 3}) == '50% 3 $x $3'

    def test_format_value_groups_thousands(self):
        assert format_value(1234567) == '1 234 567'

    def test_format_value_of_false_is_empty(self):
        assert format_value(False) == ''

    def test_format_value_keeps_text(self):
        assert format_value('ББ') == 'ББ'


class PanelSchemaTest(unittest.TestCase):

    def test_the_position_is_clamped(self):
        assert coerced_panel_settings().get('x') == 4000

    def test_a_legacy_alignment_name_is_translated(self):
        assert coerced_panel_settings().get('align_x') == 'center'

    def test_an_unknown_choice_falls_back_to_the_default(self):
        assert coerced_panel_settings().get('style') == 'a'

    def test_a_normalizer_limits_its_value(self):
        assert coerced_panel_settings().get('template') == '12345'

    def test_a_panel_has_no_enabled_switch(self):
        assert 'enabled' not in coerced_panel_settings().to_dict()

    def test_layout_props_are_the_renderer_shape(self):
        props = layout_props(coerced_panel_settings())

        assert props == {
            'x': 4000,
            'y': 0,
            'alignX': 'center',
            'alignY': 'top',
            'alpha': 0.5,
            'drag': True,
            'border': False,
            'scale': 1.0,
        }

    def test_hex_color_is_upper_cased(self):
        assert hex_color('#a0b1c2') == '#A0B1C2'

    def test_hex_color_rejects_a_colour_name(self):
        assert hex_color('red') is None

    def test_matching_keeps_a_value_of_the_pattern(self):
        assert lowercase_sound_name()('ab_c') == 'ab_c'

    def test_matching_rejects_a_value_past_the_length(self):
        assert lowercase_sound_name()('abcdef') is None

    def test_matching_rejects_a_value_outside_the_pattern(self):
        assert lowercase_sound_name()('a-b') is None

    def test_component_schema_has_no_switch(self):
        schema = component_schema({'colored': True})

        assert schema.defaults == {'colored': True}


class ComponentConfigTest(unittest.TestCase):

    def setUp(self):
        self.store = store_with_saved_sections()
        self.config = ComponentConfig(self.store)

    def test_a_section_is_coerced_to_its_schema(self):
        settings = self.config.section('damage_log', SCHEMA)

        assert settings.get('x') == 10
        assert settings.get('style') == 'b'

    def test_a_section_is_built_once(self):
        settings = self.config.section('damage_log', SCHEMA)

        assert self.config.section('damage_log', SCHEMA) is settings

    def test_a_coerced_section_is_saved(self):
        self.config.section('damage_log', SCHEMA)

        assert self.store.read()['damage_log']['x'] == 10

    def test_sections_of_uninstalled_components_are_kept(self):
        self.config.section('damage_log', SCHEMA)

        assert self.store.read()['uninstalled'] == {'x': 1}

    def test_update_reports_only_the_known_keys(self):
        self.config.section('damage_log', SCHEMA)

        changed = self.config.update('damage_log', {'y': 7, 'unknown': 1})

        assert changed == ['y']

    def test_an_update_is_saved(self):
        self.config.section('damage_log', SCHEMA)

        self.config.update('damage_log', {'y': 7, 'unknown': 1})

        assert self.store.read()['damage_log']['y'] == 7

    def test_update_of_an_unknown_section_changes_nothing(self):
        changed = self.config.update('nothing', {'y': 1})

        assert changed == []

    def test_an_unreadable_file_is_replaced(self):
        store = MemoryFile([1, 2])
        config = ComponentConfig(store)

        config.section('p', SCHEMA)

        assert list(store.read()) == ['p']


class HudLayerTest(unittest.TestCase):

    def setUp(self):
        self.backend = FakeBackend()
        self.store = MemoryFile()
        self.layer = HudLayer(self.backend, ComponentConfig(self.store))
        self.layer.register('damage_log', SCHEMA)

    def test_show_creates_the_label(self):
        shown = self.layer.show('damage_log', 'one')

        assert shown
        assert self.backend.labels[DAMAGE_LOG]['text'] == 'one'
        assert self.backend.labels[DAMAGE_LOG]['x'] == 10

    def test_showing_again_updates_the_label(self):
        self.layer.show('damage_log', 'one')

        shown = self.layer.show('damage_log', 'two')

        assert shown
        assert self.backend.calls == [('create', DAMAGE_LOG), ('update', DAMAGE_LOG)]
        assert self.backend.labels[DAMAGE_LOG]['text'] == 'two'

    def test_hide_deletes_the_label_and_hiding_twice_is_harmless(self):
        self.layer.show('damage_log', 'one')

        self.layer.hide('damage_log')
        self.layer.hide('damage_log')

        assert DAMAGE_LOG not in self.backend.labels

    def test_an_unregistered_panel_is_not_shown(self):
        assert not self.layer.show('unknown', 'x')

    def test_an_unavailable_renderer_shows_nothing(self):
        self.backend.is_available = False

        assert not self.layer.show('damage_log', 'text')

    def test_drag_persists_the_rounded_position(self):
        self.layer.show('damage_log', 'text')

        moved = self.backend.on_moved(DAMAGE_LOG, {'x': 120.4, 'y': -33, 'text': 'ignored'})

        assert moved
        assert self.store.read()['damage_log']['x'] == 120
        assert self.store.read()['damage_log']['y'] == -33

    def test_drag_of_an_unregistered_panel_is_refused(self):
        self.layer.show('damage_log', 'text')

        assert not self.backend.on_moved(alias_of('other'), {'x': 1})

    def test_drag_of_a_foreign_label_is_refused(self):
        self.layer.show('damage_log', 'text')

        assert not self.backend.on_moved('someone.else', {'x': 1})

    def test_drag_without_values_is_refused(self):
        self.layer.show('damage_log', 'text')

        assert not self.backend.on_moved(DAMAGE_LOG, None)

    def test_update_settings_reports_the_changed_keys(self):
        self.layer.show('damage_log', 'text')

        changed = self.layer.update_settings('damage_log', {'align_x': 'right', 'style': 'b'})

        assert changed == ['align_x', 'style']

    def test_update_settings_moves_a_shown_panel(self):
        self.layer.show('damage_log', 'text')

        self.layer.update_settings('damage_log', {'align_x': 'right', 'style': 'b'})

        assert self.backend.labels[DAMAGE_LOG]['alignX'] == 'right'


class HudLayerWithoutRendererTest(unittest.TestCase):

    def setUp(self):
        self.layer = HudLayer(None, ComponentConfig(MemoryFile()))
        self.layer.register('p', SCHEMA)

    def test_the_null_backend_stands_in(self):
        assert isinstance(self.layer.backend, NullBackend)

    def test_there_are_no_panels(self):
        assert not self.layer.has_panels

    def test_nothing_is_shown(self):
        assert not self.layer.show('p', 'text')


class RetiredPlaceTest(unittest.TestCase):

    def setUp(self):
        self.store = store_with_an_old_and_a_moved_panel()
        self.layer = HudLayer(FakeBackend(), ComponentConfig(self.store))

    def test_a_panel_still_at_an_old_default_place_moves_to_the_new_one(self):
        settings = self.layer.register('old', retiring_schema())

        assert settings.get('x') == 372

    def test_the_new_default_place_is_saved(self):
        self.layer.register('old', retiring_schema())

        assert self.store.read()['old']['y'] == 60

    def test_a_panel_the_player_moved_keeps_its_place(self):
        settings = self.layer.register('moved', retiring_schema())

        assert settings.get('x') == 500


class PinnedPanelTest(unittest.TestCase):

    def setUp(self):
        self.backend = FakeBackend()
        store = MemoryFile({'strip': {'y': 58, 'x': 40, 'pinned': True}})
        self.layer = HudLayer(self.backend, ComponentConfig(store))
        self.layer.register('strip', pinned_schema())
        self.layer.show('strip', 'hp')
        self.alias = alias_of('strip')

    def test_a_pinned_panel_keeps_its_default_place(self):
        label = self.backend.labels[self.alias]

        assert label['x'] == 0
        assert label['y'] == 0
        assert label['drag'] is False

    def test_a_pinned_panel_takes_no_drag(self):
        assert not self.backend.on_moved(self.alias, {'x': 300, 'y': 90})

    def test_unpinning_restores_the_saved_place_and_the_drag(self):
        self.layer.update_settings('strip', {'pinned': False})

        label = self.backend.labels[self.alias]
        assert label['x'] == 40
        assert label['drag'] is True


class MutedAndBlockedTest(unittest.TestCase):

    def setUp(self):
        self.backend = FakeBackend()
        self.layer = HudLayer(self.backend, ComponentConfig(MemoryFile()))
        self.layer.register('damage_log', SCHEMA)
        self.layer.register('session', SCHEMA)

    def show_new_texts_while_muted(self):
        self.layer.show('damage_log', 'one')
        self.layer.set_muted(True)
        self.shown_while_muted = [
            self.layer.show('damage_log', 'two'),
            self.layer.show('session', 'mine'),
        ]

    def test_muting_hides_the_shown_panels(self):
        self.layer.show('damage_log', 'one')

        self.layer.set_muted(True)

        assert self.backend.labels == {}

    def test_show_while_muted_succeeds_but_draws_nothing(self):
        self.show_new_texts_while_muted()

        assert self.shown_while_muted == [True, True]
        assert self.backend.labels == {}

    def test_unmuting_brings_back_the_latest_text(self):
        self.show_new_texts_while_muted()

        self.layer.set_muted(False)

        assert self.backend.labels[DAMAGE_LOG]['text'] == 'two'

    def test_a_blocked_panel_stays_hidden_after_unmuting(self):
        self.show_new_texts_while_muted()
        self.layer.set_blocked(['session'])

        self.layer.set_muted(False)

        assert SESSION not in self.backend.labels

    def test_a_panel_hidden_while_blocked_stays_hidden_after_unblocking(self):
        self.show_new_texts_while_muted()
        self.layer.set_blocked(['session'])
        self.layer.set_muted(False)
        self.layer.hide('session')

        self.layer.set_blocked([])

        assert SESSION not in self.backend.labels

    def test_blocking_a_shown_panel_hides_it(self):
        self.layer.show('damage_log', 'two')

        self.layer.set_blocked(['damage_log'])

        assert DAMAGE_LOG not in self.backend.labels

    def test_unblocking_brings_back_the_latest_text(self):
        self.layer.show('damage_log', 'two')
        self.layer.set_blocked(['damage_log'])

        self.layer.set_blocked([])

        assert self.backend.labels[DAMAGE_LOG]['text'] == 'two'


class HudPreviewTest(unittest.TestCase):

    def setUp(self):
        self.backend = FakeBackend()
        self.layer = HudLayer(self.backend, ComponentConfig(MemoryFile()))
        self.layer.register('damage_log', SCHEMA)
        self.bus = EventBus()
        self.state = {'enabled': True, 'hangar': True}
        self.preview = HudPreview(
            self.layer,
            'damage_log',
            lambda: PREVIEW_TEXT,
            lambda: self.state['enabled'],
            lambda: self.state['hangar'],
            (260, 120),
        ).attach(self.bus)

    def test_edit_mode_shows_the_preview(self):
        self.bus.emit(EVENT_EDIT, True)

        assert self.backend.labels[DAMAGE_LOG]['text'] == u'<font color="#FFFFFF">390</font>'

    def test_edit_mode_marks_the_panel_previewing(self):
        self.bus.emit(EVENT_EDIT, True)

        assert self.preview.previewing

    def test_leaving_edit_mode_hides_the_preview(self):
        self.bus.emit(EVENT_EDIT, True)

        self.bus.emit(EVENT_EDIT, False)

        assert DAMAGE_LOG not in self.backend.labels

    def test_leaving_edit_mode_ends_previewing(self):
        self.bus.emit(EVENT_EDIT, True)

        self.bus.emit(EVENT_EDIT, False)

        assert not self.preview.previewing

    def test_a_switched_off_panel_shows_no_preview(self):
        self.state['enabled'] = False

        self.bus.emit(EVENT_EDIT, True)

        assert DAMAGE_LOG not in self.backend.labels

    def test_a_panel_outside_the_hangar_shows_no_preview(self):
        self.state['hangar'] = False

        self.bus.emit(EVENT_EDIT, True)

        assert DAMAGE_LOG not in self.backend.labels

    def test_leaving_edit_mode_keeps_a_real_panel(self):
        self.layer.show('damage_log', 'real')

        self.bus.emit(EVENT_EDIT, False)

        assert self.backend.labels[DAMAGE_LOG]['text'] == 'real'

    def test_end_hides_the_preview(self):
        self.bus.emit(EVENT_EDIT, True)

        self.preview.end()

        assert DAMAGE_LOG not in self.backend.labels

    def test_leaving_edit_mode_after_end_deletes_nothing_more(self):
        self.bus.emit(EVENT_EDIT, True)
        self.preview.end()

        self.bus.emit(EVENT_EDIT, False)

        assert self.backend.calls.count(('delete', DAMAGE_LOG)) == 1

    def test_describe_reports_the_preview_its_size_and_its_widget(self):
        found = []

        self.bus.emit(EVENT_DESCRIBE, lambda *args: found.append(args))

        assert found == [('damage_log', u'<font color="#FFFFFF">390</font>', 260, 120, True, None)]

    def test_without_renderer_nothing_is_previewing(self):
        layer = HudLayer(FakeBackend(available=False), ComponentConfig(MemoryFile()))
        layer.register('damage_log', SCHEMA)
        preview = HudPreview(layer, 'damage_log', lambda: 'x')

        preview.on_edit(True)

        assert not preview.previewing


class ModifierTest(unittest.TestCase):

    def test_an_unknown_modifier_falls_back_to_alt(self):
        assert modifier_keys('unknown') == modifier_keys('alt')

    def test_the_right_alt_counts_as_alt(self):
        assert is_held('alt', lambda key: key == 'KEY_RALT')

    def test_ctrl_does_not_count_as_alt(self):
        assert not is_held('alt', lambda key: key == 'KEY_LCONTROL')

    def test_ctrl_alt_is_not_held_with_alt_alone(self):
        assert not is_held('ctrl_alt', lambda key: key == 'KEY_LALT')

    def test_ctrl_alt_is_held_with_one_key_of_each_group(self):
        assert is_held('ctrl_alt', lambda key: key in ('KEY_LALT', 'KEY_RCONTROL'))


class MovedValuesTest(unittest.TestCase):

    def test_renderer_props_map_to_settings(self):
        props = {'x': 1.6, 'y': -2, 'alignX': 'right', 'alignY': 'bottom', 'scale': 1.25}

        values = moved_values(props)

        assert values == {'x': 2, 'y': -2, 'align_x': 'right', 'align_y': 'bottom', 'scale': 125}

    def test_props_of_the_wrong_type_are_left_out(self):
        assert moved_values({'x': True, 'scale': 'big'}) == {}


class ShellTest(unittest.TestCase):

    def test_a_client_enum_member_is_read_by_its_name(self):
        assert shell_code(ShellMember()) == 'apcr'

    def test_a_client_kind_name_is_read(self):
        assert shell_code('hollow_charge') == 'heat'

    def test_a_battle_log_shell_type_is_read(self):
        assert shell_code(5) == 'he'

    def test_no_shell_has_no_code(self):
        assert shell_code(None) is None

    def test_an_unknown_shell_type_has_no_code(self):
        assert shell_code(99) is None

    def test_a_shell_type_has_its_client_name(self):
        assert shell_name(1) == 'ARMOR_PIERCING'


if __name__ == '__main__':
    unittest.main()

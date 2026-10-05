# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import io
import json
import os
import re
import types
import unittest

import _support  # noqa: F401
from otmetki.companion.config import DEFAULTS, FEATURES, Config
from otmetki.companion.i18n import STRINGS as COMPANION_STRINGS
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig, HudLayer, NullBackend
from otmetki.core.i18n import Catalog
from otmetki.core.settings import Schema
from otmetki.core.storage import MemoryFile
from otmetki.features.damage_log.i18n import STRINGS as DAMAGE_LOG_STRINGS
from otmetki.features.marks_panel.i18n import STRINGS as MARKS_STRINGS
from otmetki.features.session_stats.i18n import STRINGS as SESSION_STRINGS
from otmetki.ui.bridge import SettingsBridge, site_link, site_url
from otmetki.ui.components import COMPANION_ID, COMPANION_KEYS, FeatureInfo, load_features, root_package
from otmetki.ui.components.component import Component
from otmetki.ui.components.sources import SectionSource
from otmetki.ui.fields import Labels
from otmetki.ui.hud_edit import HudEditor
from otmetki.ui.i18n import STRINGS
from otmetki.ui.profiles import ProfileStore
from otmetki.ui.protocol import COMMANDS, PROTOCOL_VERSION, encode_state

UI_WEB = os.path.join(_support.MODPACK_DIR, 'ui-web', 'src', 'shared', 'api', 'protocol')
STATE_FIXTURE = os.path.join(UI_WEB, '_tests', 'fixtures', 'state.sample.json')
CLOCK_WIDGET = {'kind': 'battle_clock', 'v': 1, 'data': {'time': u'21:47'}}

PANEL_SCHEMA = Schema(
    {
        'enabled': True,
        'x': 10,
        'y': 0,
        'align_x': 'center',
        'align_y': 'top',
        'alpha': 100,
        'drag': True,
        'lines': 5,
    },
    choices={'align_x': ('left', 'center', 'right'), 'align_y': ('top', 'center', 'bottom')},
    limits={'x': (-4000, 4000), 'y': (-4000, 4000), 'alpha': (0, 100), 'lines': (1, 20)},
)
BAD_MESSAGES = ('not json', '[]', json.dumps({'type': 'nope'}), json.dumps({'type': 'set'}), 42)
UNSAFE_PATHS = ('https://evil.example', '//evil.example/x', 'javascript:alert(1)', '/a b')
PRIVATE_CONFIG_KEYS = (
    'send_shots',
    'share_settings',
    'settings_target',
    'settings_anonymous_stats',
    'settings_include_resolution',
)


class RecordingBackend(NullBackend):

    def __init__(self):
        self.calls = []

    def available(self):
        return True

    def create(self, alias, props):
        self.calls.append(('create', alias, dict(props)))
        return True

    def update(self, alias, props):
        self.calls.append(('update', alias, dict(props)))
        return True

    def delete(self, alias):
        self.calls.append(('delete', alias))
        return True


def settings_module(**attrs):
    module = types.ModuleType(str('fake_settings'))
    module.__dict__.update(attrs)
    return module


def replay_row(index):
    return {
        'id': '%04d.mtreplay' % index,
        'title': u'Бой %d' % index,
        'map_title': u'Прохоровка',
        'damage': 2150,
        'map_image': 'img://gui/maps/icons/map/stats/05_prohorovka.png',
        'favourite': False,
    }


class ReplayPage(object):

    def __init__(self):
        self.actions = []
        self.polls = []
        self.feed_items = [replay_row(index) for index in range(1000)]
        self.feed_status = 'ready'

    def ui_feed(self, poll=False):
        self.polls.append(poll)
        return {'kind': 'replays', 'status': self.feed_status, 'items': list(self.feed_items)}

    def ui_actions(self):
        return [{'id': 'refresh', 'label': 'Refresh', 'confirm': None}]

    def ui_page(self):
        row = {
            'id': 'a.mtreplay',
            'title': 'A',
            'actions': [],
            'details': [{'label': 'Map', 'value': 'Prokhorovka'}],
        }
        return {'kind': 'list', 'empty': 'none', 'rows': [row]}

    def ui_action(self, action, row, value):
        self.actions.append((action, row, value))
        return {'kind': 'info', 'text': 'done'}


EDITOR = {'groups': [{'id': 'shape', 'label': 'Shape', 'keys': ['mark']}], 'icons': {}, 'swatches': {}}


class EditorFeature(object):

    settings = None

    def ui_editor(self):
        return EDITOR


THUMB = 'img://gui/maps/icons/otmetki/space.png'
GALLERY = {'icon_set': {'bulb': 'img://gui/maps/icons/otmetki/bulb.png', 'custom': None}}


class GalleryFeature(object):

    def ui_thumb(self):
        return THUMB

    def ui_gallery(self):
        return GALLERY

    def ui_advanced(self):
        return ('zoom',)


def fake_features(page):
    return [
        FeatureInfo('marks_panel', settings_module(SETTINGS=('battle_moe_panel',), GROUP='battle')),
        FeatureInfo(
            'session_stats',
            settings_module(SETTINGS=('hangar_session_panel', 'session_idle_minutes'), GROUP='hangar'),
        ),
        FeatureInfo('minimap', settings_module(SETTINGS=(), GROUP='battle')),
        FeatureInfo('replay_manager', settings_module(SETTINGS=()), instance=page),
        FeatureInfo('damage_log', settings_module(SETTINGS=('upload_replays',))),
        FeatureInfo('hud_layouts', settings_module(SETTINGS=('battle_hud_layouts',), GROUP='battle')),
    ]


def profile_ids():
    counter = [0]

    def new_id():
        counter[0] += 1
        return 'p%d' % counter[0]
    return new_id


class FakeContext(object):

    switch_keys = FEATURES

    def __init__(self):
        self.config = Config({})
        self.saved = 0
        self.bus = EventBus(on_error=self._raise)
        self.catalog = Catalog(COMPANION_STRINGS, STRINGS, DAMAGE_LOG_STRINGS, MARKS_STRINGS, SESSION_STRINGS)
        self.current_language = 'ru'
        self.component_config = ComponentConfig(MemoryFile({'uninstalled': {'enabled': False}}))
        self.backend = RecordingBackend()
        self.layer = HudLayer(self.backend, self.component_config)
        self.profiles = ProfileStore(MemoryFile(), lambda: 1000.0, new_id=profile_ids())
        self.events = []
        self.opened = []
        self.bound = []
        self.closed = 0
        self.escapes_answered = 0
        self.editing = []
        self.actions = []
        self.refreshed = []
        self.page = ReplayPage()
        self._add_sections()
        self._listen()

    def _add_sections(self):
        minimap = Schema({'enabled': True, 'zoom': 'native'}, choices={'zoom': ('native', 'x2')})
        hud_layouts = Schema({'event': 'compact'}, choices={'event': ('full', 'compact', 'off')})
        self.component_config.section('minimap', minimap)
        self.component_config.section('hud_layouts', hud_layouts)
        self.layer.register('damage_log', PANEL_SCHEMA)

    def _listen(self):
        self.bus.on('component_settings', lambda component, changed: self.events.append((component, changed)))
        self.bus.on('hud_edit', lambda active: self.events.append(('hud_edit', active)))
        self.bus.on('hud_describe', self._describe_panels)

    @staticmethod
    def _describe_panels(collect):
        collect('damage_log', preview='<font color="#fff">1 200</font>', width=300)

    @staticmethod
    def _raise(context):
        raise AssertionError(context)

    def save_config(self):
        self.saved += 1

    def language(self):
        return self.current_language

    def features(self):
        return fake_features(self.page)

    def status(self):
        return {'bound': False, 'auth_failed': False, 'account_id': None, 'text': 'not bound'}

    def set_language(self, language):
        self.config.update({'language': language})
        self.current_language = 'en' if language == 'en' else 'ru'

    def config_changed(self, keys):
        self.refreshed.append(keys)

    def companion_action(self, action):
        self.actions.append(action)

    def bind(self, code):
        self.bound.append(code)

    def open_url(self, url):
        self.opened.append(url)

    def close(self):
        self.closed += 1

    def escape_answered(self):
        self.escapes_answered += 1

    def hud_editing(self, active):
        self.editing.append(active)


def send(bridge, **message):
    return bridge.handle(json.dumps(message))


def card(state, component_id):
    return [item for item in state['components'] if item['id'] == component_id][0]


def field_keys(described):
    return [field['key'] for field in described['fields']]


def placement(state, component_id):
    described = card(state, component_id)
    return described['section'], described['context']


class BridgeTestCase(unittest.TestCase):

    def setUp(self):
        self.context = FakeContext()
        self.bridge = SettingsBridge(self.context)

    def minimap(self):
        return self.context.component_config.get('minimap')

    def damage_log(self):
        return self.context.component_config.get('damage_log')

    def notice_kind(self):
        return self.bridge.notice['kind']


class BridgeStateTest(BridgeTestCase):

    def test_cards_in_order_with_their_sources(self):
        ids = [item['id'] for item in self.bridge.state()['components']]

        assert ids == [
            COMPANION_ID,
            'marks_panel',
            'session_stats',
            'minimap',
            'replay_manager',
            'damage_log',
            'hud_layouts',
        ]

    def test_a_hud_shaping_card_sits_on_the_hud_page_with_its_config_switch(self):
        hud_layouts = card(self.bridge.state(), 'hud_layouts')

        assert hud_layouts['section'] == 'hud'
        assert hud_layouts['switch'] == {'key': 'battle_hud_layouts', 'value': True}

    def test_state_carries_the_language_and_the_site(self):
        state = self.bridge.state()

        assert state['language'] == 'ru'
        assert state['languages'] == ['ru', 'en']
        assert state['site'] == 'https://triotmetki.ru'

    def test_companion_card_has_its_master_switch(self):
        companion = card(self.bridge.state(), COMPANION_ID)

        assert companion['switch'] == {'key': 'enabled', 'value': True}

    def test_companion_card_lists_its_own_keys_only(self):
        keys = field_keys(card(self.bridge.state(), COMPANION_ID))

        assert set(keys) <= set(COMPANION_KEYS)
        assert 'server_url' not in keys
        assert 'bind_code' not in keys
        assert 'hangar_session_panel' not in keys

    def test_companion_card_offers_the_settings_share_actions(self):
        companion = card(self.bridge.state(), COMPANION_ID)

        assert [action['id'] for action in companion['actions']] == ['settings_export']

    def test_config_feature_card_uses_its_switch(self):
        session = card(self.bridge.state(), 'session_stats')

        assert session['switch'] == {'key': 'hangar_session_panel', 'value': True}
        assert session['title'] == u'Сессия'

    def test_config_feature_card_uses_the_schema_limits(self):
        idle = card(self.bridge.state(), 'session_stats')['fields'][0]

        assert idle['key'] == 'session_idle_minutes'
        assert idle['type'] == 'int'
        assert idle['min'] == 10
        assert idle['max'] == 24 * 60

    def test_section_card_renders_choices_with_labels(self):
        minimap = card(self.bridge.state(), 'minimap')

        zoom = minimap['fields'][0]
        assert minimap['group'] == 'battle'
        assert zoom['type'] == 'choice'
        assert zoom['choices'][0] == {'value': 'native', 'label': u'Как в игре'}

    def test_panel_card_hides_position_keys(self):
        damage = card(self.bridge.state(), 'damage_log')

        keys = field_keys(damage)
        assert damage['panel'] is True
        assert 'x' not in keys
        assert 'align_x' not in keys
        assert 'drag' not in keys
        assert 'enabled' not in keys

    def test_panel_card_shows_its_look_keys(self):
        keys = field_keys(card(self.bridge.state(), 'damage_log'))

        assert 'lines' in keys
        assert 'alpha' in keys

    def test_panel_card_is_switched_by_its_config_key(self):
        damage = card(self.bridge.state(), 'damage_log')

        assert damage['switch'] == {'key': 'upload_replays', 'value': False}

    def test_page_and_actions_come_from_the_instance(self):
        replays = card(self.bridge.state(), 'replay_manager')

        assert replays['page']['kind'] == 'list'
        assert replays['actions'][0]['id'] == 'refresh'

    def test_a_card_without_an_editor_sends_none(self):
        replays = card(self.bridge.state(), 'replay_manager')

        assert 'editor' not in replays

    def test_the_editor_comes_from_the_instance(self):
        feature = EditorFeature()
        component = Component('crosshair', 'battle', feature, (), instance=feature)

        described = component.describe(Labels(Catalog(), 'en'))

        assert described['editor'] == EDITOR

    def test_a_card_without_the_picture_hooks_sends_no_thumb_or_gallery(self):
        replays = card(self.bridge.state(), 'replay_manager')

        assert 'thumb' not in replays
        assert 'gallery' not in replays

    def test_the_thumb_and_the_gallery_come_from_the_instance(self):
        feature = GalleryFeature()
        component = Component('sixth_sense', 'battle', SectionSource(self.context.component_config, 'minimap'),
                              ('enabled', 'zoom'), instance=feature)

        described = component.describe(Labels(Catalog(), 'en'))

        assert described['thumb'] == THUMB
        assert described['gallery'] == GALLERY

    def test_fields_named_by_the_instance_are_advanced(self):
        component = Component('minimap', 'battle', SectionSource(self.context.component_config, 'minimap'),
                              ('enabled', 'zoom'), instance=GalleryFeature())

        fields = component.describe(Labels(Catalog(), 'en'))['fields']

        assert [(field['key'], field.get('advanced')) for field in fields] == [('enabled', None), ('zoom', True)]

    def test_fields_the_settings_name_are_advanced(self):
        feature = FeatureInfo('minimap', settings_module(SETTINGS=(), ADVANCED=('zoom',)))
        component = Component('minimap', 'battle', SectionSource(self.context.component_config, 'minimap'),
                              ('enabled', 'zoom'), advanced=feature.advanced())

        fields = component.describe(Labels(Catalog(), 'en'))['fields']

        assert [(field['key'], field.get('advanced')) for field in fields] == [('enabled', None), ('zoom', True)]

    def test_the_editor_module_draws_the_editor_from_the_section(self):
        editor_module = settings_module(editor=lambda settings, translate: {'zoom': settings.get('zoom'),
                                                                           'title': translate('nope')})
        feature = FeatureInfo('minimap', settings_module(SETTINGS=()), editor_module=editor_module)
        component = Component('minimap', 'battle', SectionSource(self.context.component_config, 'minimap'),
                              ('enabled', 'zoom'), editor=feature.editor())

        described = component.describe(Labels(Catalog(), 'en'))

        assert described['editor'] == {'zoom': 'native', 'title': 'nope'}

    def test_a_hangar_label_hides_its_place(self):
        self.context.component_config.section('label', Schema({'x': 0, 'scale': 100, 'show': True}))
        component = Component('label', 'hangar', SectionSource(self.context.component_config, 'label'),
                              ('x', 'scale', 'show'))

        fields = component.describe(Labels(Catalog(), 'en'))['fields']

        assert [field['key'] for field in fields] == ['show']

    def test_a_panel_folds_its_opacity(self):
        fields = card(self.bridge.state(), 'damage_log')['fields']

        assert [(field['key'], field.get('advanced')) for field in fields] == [('alpha', True), ('lines', None)]

    def test_fields_carry_no_advanced_key_without_the_hook(self):
        fields = card(self.bridge.state(), 'minimap')['fields']

        assert all('advanced' not in field for field in fields)

    def test_cards_carry_their_page_and_context(self):
        state = self.bridge.state()

        assert placement(state, COMPANION_ID) == ('data', 'any')
        assert placement(state, 'marks_panel') == ('marks', 'any')
        assert placement(state, 'replay_manager') == ('replays', 'hangar')

    def test_window_layout_defaults_to_centred(self):
        window = self.bridge.state()['window']

        assert window == {'placed': False, 'x': 0, 'y': 0, 'width': 0, 'height': 0, 'zoom': 100}

    def test_hud_panels_carry_the_preview_without_markup(self):
        panel = self.bridge.state()['hud']['panels'][0]

        assert panel['id'] == 'damage_log'
        assert panel['preview'] == '1 200'
        assert panel['width'] == 300
        assert panel['height'] == 40
        assert panel['x'] == 10


class Titles(object):

    @staticmethod
    def title(panel_id):
        return panel_id


class HudEditorPreviewTest(unittest.TestCase):

    def setUp(self):
        bus = EventBus()
        layer = HudLayer(NullBackend(), ComponentConfig(MemoryFile()))
        layer.register('battle_clock', Schema({'x': 0, 'y': 0, 'align_x': 'center', 'align_y': 'top'}))
        bus.on('hud_describe', lambda collect: collect('battle_clock', u'<b>21:47</b>', 120, 30, True, CLOCK_WIDGET))
        self.editor = HudEditor(bus, layer)

    def test_a_panel_carries_its_preview_widget_for_the_page_renderer(self):
        panel = self.editor.panels(Titles())[0]

        assert panel['widget'] == CLOCK_WIDGET

    def test_a_panel_carries_its_rich_preview_text(self):
        panel = self.editor.panels(Titles())[0]

        assert panel['text'] == u'<b>21:47</b>'


class FocusPageTest(BridgeTestCase):

    def test_no_page_is_focused_at_first(self):
        assert self.bridge.state()['focus'] is None

    def test_a_package_opens_the_window_at_a_page(self):
        focused = self.bridge.focus_page('replays')

        assert focused is True
        assert self.bridge.state()['focus'] == {'section': 'replays', 'seq': 1}

    def test_each_focus_gets_the_next_number(self):
        self.bridge.focus_page('replays')

        self.bridge.focus_page('hud')

        assert self.bridge.state()['focus'] == {'section': 'hud', 'seq': 2}

    def test_an_unknown_page_keeps_the_focus(self):
        self.bridge.focus_page('hud')

        focused = self.bridge.focus_page('garage')

        assert focused is False
        assert self.bridge.state()['focus']['section'] == 'hud'


class SetMessageTest(BridgeTestCase):

    def test_set_a_companion_switch(self):
        send(self.bridge, type='set', component=COMPANION_ID, key='send_shots', value=False)

        assert self.context.config.get('send_shots') is False
        assert self.context.saved == 2
        assert self.context.events == [(COMPANION_ID, ['send_shots'])]
        assert self.context.refreshed == [['send_shots']]

    def test_set_a_section_value_through_its_schema(self):
        send(self.bridge, type='set', component='minimap', key='zoom', value='x2')

        assert self.minimap().get('zoom') == 'x2'

    def test_a_value_outside_the_schema_is_refused(self):
        send(self.bridge, type='set', component='minimap', key='zoom', value='x2')

        send(self.bridge, type='set', component='minimap', key='zoom', value='x99')

        assert self.notice_kind() == 'error'
        assert self.minimap().get('zoom') == 'x2'

    def test_panel_switch_lives_in_config(self):
        send(self.bridge, type='set', component='damage_log', key='upload_replays', value=True)

        assert self.context.config.get('upload_replays') is True
        assert self.context.refreshed == [['upload_replays']]

    def test_a_config_key_outside_the_card_is_refused(self):
        send(self.bridge, type='set', component=COMPANION_ID, key='server_url', value='https://evil.example')

        assert self.context.config.get('server_url') == 'https://api.triotmetki.ru'
        assert self.notice_kind() == 'error'

    def test_a_panel_position_is_not_a_card_setting(self):
        send(self.bridge, type='set', component='damage_log', key='x', value=5)

        assert self.damage_log().get('x') == 10


class SetManyMessageTest(BridgeTestCase):

    def test_set_many_resets_a_card_in_one_message(self):
        send(self.bridge, type='set', component='minimap', key='zoom', value='x2')

        send(self.bridge, type='set_many', component='minimap', values={'zoom': 'native', 'enabled': False})

        assert self.minimap().get('zoom') == 'native'
        assert self.minimap().get('enabled') is False
        assert self.context.events[-1] == ('minimap', ['enabled', 'zoom'])

    def test_set_many_on_the_companion_saves_each_key_and_refreshes_once(self):
        values = {'send_shots': False, 'send_queue_times': False}

        send(self.bridge, type='set_many', component=COMPANION_ID, values=values)

        assert self.context.refreshed[-1] == ['send_queue_times', 'send_shots']
        assert self.context.saved == 3

    def test_set_many_refuses_keys_outside_the_card(self):
        refused = []
        for values in ({'server_url': 'https://evil.example', 'send_shots': False}, {}, ['send_shots']):
            send(self.bridge, type='set_many', component=COMPANION_ID, values=values)
            refused.append(self.notice_kind())

        assert refused == ['error', 'error', 'error']
        assert self.context.config.get('send_shots') is True


class SectionWithConfigKeysTest(BridgeTestCase):

    def setUp(self):
        BridgeTestCase.setUp(self)
        self.context.component_config.section('session_stats', Schema({'show_goals': True}))

    def test_the_card_shows_its_section_and_its_config_keys(self):
        session = card(self.bridge.state(), 'session_stats')

        assert field_keys(session) == ['show_goals', 'session_idle_minutes']

    def test_a_config_key_keeps_its_config_limits(self):
        idle = card(self.bridge.state(), 'session_stats')['fields'][1]

        assert idle['max'] == 24 * 60

    def test_a_config_key_of_the_card_is_saved_in_config(self):
        send(self.bridge, type='set', component='session_stats', key='session_idle_minutes', value=30)

        assert self.context.config.get('session_idle_minutes') == 30
        assert self.context.refreshed == [['session_idle_minutes']]

    def test_a_section_key_of_the_card_stays_in_its_section(self):
        send(self.bridge, type='set', component='session_stats', key='show_goals', value=False)

        assert self.context.component_config.get('session_stats').get('show_goals') is False

    def test_the_switch_stays_in_config(self):
        session = card(self.bridge.state(), 'session_stats')

        assert session['switch'] == {'key': 'hangar_session_panel', 'value': True}


class UserSetTest(BridgeTestCase):

    def user_set(self):
        return self.context.config.get('user_set')

    def test_a_changed_switch_is_recorded_by_name(self):
        send(self.bridge, type='set', component=COMPANION_ID, key='send_shots', value=False)

        assert self.user_set() == 'send_shots'

    def test_a_changed_section_value_is_recorded_with_its_section(self):
        send(self.bridge, type='set', component='minimap', key='zoom', value='x2')

        assert self.user_set() == 'minimap.zoom'

    def test_every_change_joins_the_recorded_keys_once(self):
        send(self.bridge, type='set', component='minimap', key='zoom', value='x2')
        send(self.bridge, type='set', component='damage_log', key='upload_replays', value=True)
        send(self.bridge, type='set', component='minimap', key='zoom', value='native')

        assert self.user_set() == 'minimap.zoom upload_replays'

    def test_a_card_reset_records_each_changed_key(self):
        send(self.bridge, type='set_many', component='minimap', values={'zoom': 'x2', 'enabled': False})

        assert self.user_set() == 'minimap.enabled minimap.zoom'

    def test_a_refused_value_records_nothing(self):
        send(self.bridge, type='set', component='minimap', key='zoom', value='x99')

        assert self.user_set() == ''

    def test_a_value_set_again_unchanged_records_nothing(self):
        send(self.bridge, type='set', component='minimap', key='zoom', value='native')

        assert self.user_set() == ''

    def test_a_hud_move_records_nothing(self):
        send(self.bridge, type='hud_move', panel='damage_log', x=50, y=60)

        assert self.user_set() == ''

    def test_a_profile_load_records_nothing(self):
        send(self.bridge, type='profile_save', name='A')
        self.context.profiles.get('p1')['data']['config']['hud_modifier'] = 'ctrl'

        send(self.bridge, type='profile_load', id='p1')

        assert self.user_set() == ''


class QuietMessageTest(BridgeTestCase):

    def test_an_escape_answer_reaches_the_window_without_a_new_state(self):
        changed = send(self.bridge, type='escape')

        assert changed is False
        assert self.context.escapes_answered == 1
        assert self.context.closed == 0

    def test_the_scroll_position_of_a_page_is_kept_for_the_session(self):
        changed = send(self.bridge, type='scroll', page='hangar', top=412.6)

        assert changed is False
        assert self.bridge.state()['scroll'] == {'hangar': 412}

    def test_a_scroll_position_of_an_unknown_page_is_refused(self):
        send(self.bridge, type='scroll', page='search', top=100)

        assert self.notice_kind() == 'error'
        assert self.bridge.state()['scroll'] == {}

    def test_a_scroll_position_that_is_not_a_number_is_refused(self):
        send(self.bridge, type='scroll', page='battle', top='far')

        assert self.notice_kind() == 'error'
        assert self.bridge.state()['scroll'] == {}

    def test_a_page_diag_line_goes_to_the_log_and_changes_nothing(self):
        revision = self.bridge.revision

        changed = send(self.bridge, type='diag', text='wheel: deltaY 100')

        assert changed is False
        assert self.bridge.revision == revision
        assert self.bridge.notice is None

    def test_a_diag_without_text_is_refused(self):
        send(self.bridge, type='diag')

        assert self.notice_kind() == 'error'


class WindowLayoutMessageTest(BridgeTestCase):

    def test_window_layout_is_kept_and_clamped(self):
        send(self.bridge, type='window_layout', x=120.4, y=-40, width=99999, height=640, zoom=110)

        window = self.bridge.state()['window']
        assert window == {'placed': True, 'x': 120, 'y': -40, 'width': 8000, 'height': 640, 'zoom': 110}

    def test_an_unplaced_window_keeps_its_valid_zoom(self):
        send(self.bridge, type='window_layout', x=120.4, y=-40, width=99999, height=640, zoom=110)

        send(self.bridge, type='window_layout', x=0, y=0, width=0, height=0, zoom='big', placed=False)

        window = self.bridge.state()['window']
        assert window['placed'] is False
        assert window['zoom'] == 110


class BadMessageTest(BridgeTestCase):

    def test_every_protocol_command_has_a_handler(self):
        unhandled = [command for command in COMMANDS if not callable(getattr(self.bridge, '_on_' + command, None))]

        assert unhandled == []

    def test_bad_messages_become_notices(self):
        results = []
        for raw in BAD_MESSAGES:
            changed = self.bridge.handle(raw)
            results.append((changed, self.notice_kind()))

        assert results == [(True, 'error')] * len(BAD_MESSAGES)


class ActionMessageTest(BridgeTestCase):

    def test_a_companion_action_goes_to_the_app(self):
        send(self.bridge, type='action', component=COMPANION_ID, action='settings_export')

        assert self.context.actions == ['settings_export']

    def test_a_feature_action_goes_to_its_instance(self):
        send(self.bridge, type='action', component='replay_manager', action='rename', row='a.mtreplay', value='B')

        assert self.context.page.actions == [('rename', 'a.mtreplay', 'B')]
        assert self.bridge.notice == {'kind': 'info', 'text': 'done', 'code': None}

    def test_an_action_of_a_card_without_actions_is_refused(self):
        send(self.bridge, type='action', component='minimap', action='rename')

        assert self.notice_kind() == 'error'


class LanguageBindCloseTest(BridgeTestCase):

    def test_language_switches_the_state(self):
        send(self.bridge, type='language', language='en')

        assert self.bridge.state()['language'] == 'en'

    def test_an_unknown_language_is_refused(self):
        send(self.bridge, type='language', language='de')

        assert self.notice_kind() == 'error'

    def test_bind_trims_the_code(self):
        send(self.bridge, type='bind', code='  ABCDEFGH23 ')

        assert self.context.bound == ['ABCDEFGH23']

    def test_close_closes_the_window(self):
        send(self.bridge, type='close')

        assert self.context.closed == 1


class OpenLinkTest(BridgeTestCase):

    def test_a_site_relative_link_opens_on_the_site(self):
        send(self.bridge, type='open', path='/replays/7b0c')

        assert self.context.opened == ['https://triotmetki.ru/replays/7b0c']

    def test_other_links_never_open(self):
        for path in UNSAFE_PATHS:
            send(self.bridge, type='open', path=path)

        assert self.context.opened == []


class HudEditMessageTest(BridgeTestCase):

    def test_hud_move_is_clamped(self):
        send(self.bridge, type='hud_move', panel='damage_log', x=120.6, y=99999, align_x='right')

        section = self.damage_log()
        assert section.get('x') == 121
        assert section.get('y') == 4000
        assert section.get('align_x') == 'right'

    def test_hud_move_is_live(self):
        self.context.layer.show('damage_log', 'text')

        send(self.bridge, type='hud_move', panel='damage_log', x=120.6, y=99999, align_x='right')

        assert self.context.backend.calls[-1][0] == 'update'
        assert self.context.events[-1] == ('damage_log', ['align_x', 'x', 'y'])

    def test_hud_reset_restores_the_default_position(self):
        send(self.bridge, type='hud_move', panel='damage_log', x=120.6, y=99999, align_x='right')

        send(self.bridge, type='hud_reset', panel='damage_log')

        assert self.damage_log().get('x') == 10
        assert self.damage_log().get('align_x') == 'center'

    def test_hud_edit_mode_on_the_bus(self):
        send(self.bridge, type='hud_edit', active=True)
        send(self.bridge, type='hud_edit', active=True)

        send(self.bridge, type='close')

        assert self.context.events == [('hud_edit', True), ('hud_edit', False)]
        assert self.context.editing == [True]


class BridgeFeedTest(BridgeTestCase):

    def watch(self):
        return send(self.bridge, type='feed', component='replay_manager', active=True)

    def snapshot(self):
        self.watch()
        return json.loads(self.bridge.feed_text(100.0, force=True))

    def test_watching_a_feed_is_quiet(self):
        revision = self.bridge.revision

        changed = self.watch()

        assert changed is False
        assert self.bridge.revision == revision
        assert self.bridge.notice is None

    def test_nothing_is_sent_before_the_page_watches_a_feed(self):
        text = self.bridge.feed_text(0.0, force=True)

        assert text is None
        assert self.context.page.polls == []

    def test_a_watched_feed_sends_a_snapshot_first(self):
        snapshot = self.snapshot()

        assert snapshot['v'] == PROTOCOL_VERSION
        assert snapshot['feed'] == 'replay_manager'
        assert snapshot['base'] is None
        assert len(snapshot['items']) == 1000
        assert self.context.page.polls == [False]

    def test_a_poll_before_the_interval_reads_nothing(self):
        self.snapshot()

        text = self.bridge.feed_text(101.0)

        assert text is None
        assert self.context.page.polls == [False]

    def test_a_poll_after_the_interval_reads_the_page_and_sends_nothing_unchanged(self):
        self.snapshot()

        text = self.bridge.feed_text(103.0)

        assert text is None
        assert self.context.page.polls == [False, True]

    def test_a_forced_read_sends_a_delta_of_what_changed(self):
        snapshot = self.snapshot()
        page = self.context.page
        page.feed_items[7] = dict(page.feed_items[7], favourite=True)
        page.feed_status = 'indexing'

        delta = json.loads(self.bridge.feed_text(104.0, force=True))

        assert delta['base'] == snapshot['rev']
        assert [item['id'] for item in delta['set']] == ['0007.mtreplay']
        assert delta['page'] == {'kind': 'replays', 'status': 'indexing'}
        assert delta['del'] == []
        assert page.polls[-1] is False

    def test_the_settings_state_never_carries_the_feed(self):
        self.watch()
        feed = self.bridge.feed_text(0.0, force=True)

        state = encode_state(self.bridge.state())

        assert '0999.mtreplay' not in state
        assert len(feed) > 10 * len(json.dumps(card(self.bridge.state(), 'replay_manager')))

    def test_watching_again_starts_with_a_newer_snapshot(self):
        self.watch()
        first = json.loads(self.bridge.feed_text(0.0, force=True))
        self.watch()

        again = json.loads(self.bridge.feed_text(1.0))

        assert again['base'] is None
        assert again['rev'] > first['rev']

    def test_the_page_stops_watching(self):
        self.watch()

        send(self.bridge, type='feed', component='replay_manager', active=False)

        assert self.bridge.watched is None
        assert self.bridge.feed_text(10.0, force=True) is None

    def test_stop_feed_stops_watching(self):
        self.watch()

        self.bridge.stop_feed()

        assert self.bridge.feed_text(10.0, force=True) is None

    def test_an_unknown_feed_is_a_notice(self):
        changed = send(self.bridge, type='feed', component='minimap', active=True)

        assert changed is True
        assert self.notice_kind() == 'error'
        assert self.bridge.watched is None


class BridgeProfilesTest(BridgeTestCase):

    def saved_profile(self, name='A'):
        send(self.bridge, type='profile_save', name=name)
        return self.context.profiles.get('p1')['data']

    def test_save_normalizes_the_name_and_activates_the_profile(self):
        send(self.bridge, type='profile_save', name='  Streamer   setup ')

        profiles = self.bridge.state()['profiles']
        assert profiles == {'active': 'p1', 'items': [{'id': 'p1', 'name': 'Streamer setup', 'updated': 1000.0}]}

    def test_load_restores_the_saved_settings(self):
        self.saved_profile()
        send(self.bridge, type='set', component=COMPANION_ID, key='hud_modifier', value='ctrl')
        send(self.bridge, type='set', component='minimap', key='zoom', value='x2')
        send(self.bridge, type='hud_move', panel='damage_log', x=50, y=60)
        del self.context.events[:]

        send(self.bridge, type='profile_load', id='p1')

        assert self.context.config.get('hud_modifier') == 'alt'
        assert self.minimap().get('zoom') == 'native'
        assert self.damage_log().get('x') == 10
        assert sorted(event[0] for event in self.context.events) == ['config', 'damage_log', 'minimap']

    def test_profile_never_carries_the_install_history(self):
        send(self.bridge, type='set', component='minimap', key='zoom', value='x2')

        data = self.saved_profile()

        assert 'user_set' not in data['config']
        assert 'defaults_revision' not in data['config']

    def test_profile_never_carries_the_connection(self):
        data = self.saved_profile()

        assert 'server_url' not in data['config']
        assert 'bind_code' not in data['config']

    def test_profile_carries_uninstalled_sections(self):
        data = self.saved_profile()

        assert data['components']['uninstalled'] == {'enabled': False}

    def test_profile_never_carries_privacy_or_network_flags(self):
        data = self.saved_profile()

        carried = [key for key in PRIVATE_CONFIG_KEYS if key in data['config']]
        assert carried == []

    def test_loading_a_profile_never_sets_privacy_or_network_flags(self):
        data = self.saved_profile()
        send(self.bridge, type='set', component=COMPANION_ID, key='send_shots', value=False)
        data['config'].update(send_shots=True, publish_replays=True, upload_replays=True, settings_target='profile')

        send(self.bridge, type='profile_load', id='p1')

        assert self.context.config.get('send_shots') is False
        assert self.context.config.get('publish_replays') is False
        assert self.context.config.get('upload_replays') is False
        assert self.context.config.get('settings_target') == 'private'

    def test_rename(self):
        self.saved_profile()

        send(self.bridge, type='profile_rename', id='p1', name='B')

        assert self.context.profiles.get('p1')['name'] == 'B'

    def test_a_blank_name_is_refused(self):
        self.saved_profile()

        send(self.bridge, type='profile_rename', id='p1', name='   ')

        assert self.notice_kind() == 'error'

    def test_the_number_of_profiles_is_limited(self):
        for index in range(12):
            send(self.bridge, type='profile_save', name='N%d' % index)

        send(self.bridge, type='profile_save', name='too many')

        assert self.bridge.notice['text'] == STRINGS['ru']['error_profile_limit']

    def test_delete(self):
        for index in range(12):
            send(self.bridge, type='profile_save', name='N%d' % index)

        send(self.bridge, type='profile_delete', id='p1')

        assert self.context.profiles.get('p1') is None
        assert len(self.context.profiles.items()) == 11

    def test_profile_never_carries_the_window_layout(self):
        send(self.bridge, type='window_layout', x=10, y=20, width=900, height=600, zoom=90)

        data = self.saved_profile()

        assert 'settings_window' not in data['components']

    def test_loading_a_profile_keeps_the_window_layout(self):
        data = self.saved_profile()
        send(self.bridge, type='window_layout', x=500, y=20, width=900, height=600, zoom=90)
        data['components']['settings_window'] = {'x': 1}

        send(self.bridge, type='profile_load', id='p1')

        assert self.bridge.state()['window']['x'] == 500


class ProfileCodeTest(BridgeTestCase):

    def exported_code(self):
        send(self.bridge, type='set', component='minimap', key='zoom', value='x2')
        send(self.bridge, type='profile_save', name=u'Мой')
        send(self.bridge, type='profile_export', id='p1')
        return self.bridge.notice

    def test_export_shows_a_code(self):
        notice = self.exported_code()

        assert notice['kind'] == 'code'
        assert notice['code'].startswith('TM1.')

    def test_import_round_trip(self):
        code = self.exported_code()['code']

        send(self.bridge, type='profile_import', code=code)

        imported = self.context.profiles.get('p2')
        assert imported['name'] == u'Мой'
        assert imported['data']['components']['minimap']['zoom'] == 'x2'

    def test_a_broken_code_is_refused(self):
        send(self.bridge, type='profile_import', code='TM1.garbage')

        assert self.notice_kind() == 'error'


class DiscoveryTest(unittest.TestCase):

    def test_root_package_in_the_client(self):
        assert root_package('gui.mods.otmetki.ui.client.context') == 'gui.mods.otmetki'

    def test_root_package_in_the_tests(self):
        assert root_package('otmetki.ui.client.context') == 'otmetki'

    def test_load_features_reads_settings_modules(self):
        instances = {'ui': object(), 'session_stats': object(), 'missing_one': object()}

        features = load_features('otmetki', instances, skip=('ui',))

        assert [feature.id for feature in features] == ['missing_one', 'session_stats']
        assert features[0].settings_module is None
        assert features[1].config_keys() == (
            'hangar_session_panel',
            'session_idle_minutes',
            'share_session_report',
            'share_session_channel',
        )
        assert features[1].title == 'Three Marks: session stats'

    def test_companion_keys_are_real_and_unclaimed(self):
        claimed = set()
        for feature_id in _support.feature_ids():
            try:
                settings = importlib.import_module('otmetki.features.%s.settings' % feature_id)
            except ImportError:
                continue
            claimed.update(getattr(settings, 'SETTINGS', ()))

        unknown = [key for key in COMPANION_KEYS if key not in DEFAULTS]
        taken = [key for key in COMPANION_KEYS if key in claimed]
        assert unknown == []
        assert taken == []


class SiteLinkTest(unittest.TestCase):

    def test_the_production_api_maps_to_the_site(self):
        assert site_url('https://api.triotmetki.ru') == 'https://triotmetki.ru'

    def test_a_local_api_maps_to_the_local_site(self):
        assert site_url('http://localhost:4000') == 'http://localhost:3000'

    def test_another_server_maps_to_the_production_site(self):
        assert site_url('https://other.example') == 'https://triotmetki.ru'

    def test_a_site_path_becomes_a_site_link(self):
        link = site_link('https://api.triotmetki.ru', '/profile/mod?tab=replays')

        assert link == 'https://triotmetki.ru/profile/mod?tab=replays'

    def test_a_relative_path_is_no_link(self):
        assert site_link('https://api.triotmetki.ru', 'relative') is None


class PageContractTest(unittest.TestCase):

    def sample_state(self):
        bridge = SettingsBridge(FakeContext())
        send(bridge, type='profile_save', name=u'Стример')
        return json.loads(encode_state(bridge.state()))

    def test_state_fixture_is_current(self):
        state = self.sample_state()
        if os.environ.get('OTMETKI_UPDATE_FIXTURES') == '1':
            with io.open(STATE_FIXTURE, 'w', encoding='utf-8', newline='\n') as handle:
                handle.write(json.dumps(state, sort_keys=True, indent=2, ensure_ascii=False) + '\n')

        with io.open(STATE_FIXTURE, 'r', encoding='utf-8') as handle:
            fixture = json.load(handle)

        assert fixture == state

    def test_commands_match_the_page(self):
        with io.open(os.path.join(UI_WEB, 'protocol.constants.ts'), 'r', encoding='utf-8') as handle:
            source = handle.read()

        block = re.search(r'commands: \[([^\]]*)\]', source).group(1)

        assert tuple(re.findall(r"'([a-z_]+)'", block)) == COMMANDS


if __name__ == '__main__':
    unittest.main()

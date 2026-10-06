# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import importlib
import json
import sys
import types
import unittest

import _support
from otmetki.core.events import EventBus
from otmetki.core.hud import ComponentConfig
from _support import MemoryFile
from otmetki.features.preset_advisor.i18n import STRINGS
from otmetki.features.preset_advisor.model import AdviceCache, advice_path, advised_ids, page_payload, parse_advice
from otmetki.features.preset_advisor.settings import SCHEMA, SETTINGS

TANK = 2849
OTHER_TANK = 4385
STOCK_MODULE = 'gui.impl.gen.view_models.views.lobby.tank_setup.ammunition_setup_view_model'
STUBBED = ('BigWorld', 'CurrentVehicle', 'frameworks', 'frameworks.wulf', 'openwg_gameface', STOCK_MODULE)
DROPPED_PREFIXES = ('otmetki.core.client', 'otmetki.features.preset_advisor.client')
ANSWER = {
    'tankId': TANK,
    'isEnough': True,
    'battles': 420,
    'equipment': [1001, 1002, 1003],
    'directives': [2001],
    'consumables': [3001, 3002, 3003],
}


class Event(object):

    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self

    def __isub__(self, handler):
        self.handlers.remove(handler)
        return self

    def __call__(self, *args):
        for handler in list(self.handlers):
            handler(*args)


class ViewModel(object):

    def __init__(self, properties=0, commands=0):
        self.capacity = properties
        self.names = []
        self.values = []
        self._initialize()

    def _initialize(self):
        pass

    def _add(self, name, value):
        assert len(self.names) < self.capacity, 'no property left for %s' % name
        self.names.append(name)
        self.values.append(value)

    def _addStringProperty(self, name, value=''):
        self._add(name, value)

    def _addViewModelProperty(self, name, model):
        self._add(name, model)

    def _setString(self, index, value):
        self.values[index] = value

    def prop(self, name):
        return self.values[self.names.index(name)]


def stock_model_class():

    class AmmunitionSetupViewModel(ViewModel):

        def __init__(self, properties=9, commands=4):
            super(AmmunitionSetupViewModel, self).__init__(properties=properties, commands=commands)

        def _initialize(self):
            super(AmmunitionSetupViewModel, self)._initialize()
            for index in range(9):
                self._addStringProperty('stock%d' % index)

    return AmmunitionSetupViewModel


def gf_mod_inject(model, name, styles=None, scripts=None, modules=None):
    model._addViewModelProperty('ModInjectModel', {'name': name, 'scripts': list(scripts or ())})


def module(name, **attrs):
    stub = types.ModuleType(str(name))
    for key, value in attrs.items():
        setattr(stub, key, value)
    return stub


class Vehicle(object):

    def __init__(self, int_cd):
        self.intCD = int_cd


class CurrentVehicle(object):

    def __init__(self, item):
        self.item = item
        self.onChanged = Event()


class Config(object):

    def __init__(self):
        self.enabled = True

    def is_enabled(self, switch):
        return self.enabled

    def endpoint(self, path):
        return 'https://api.triotmetki.ru' + path


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.translate = _support.translator({'ru': {}, 'en': {}})
        self.config = Config()
        self.transport = _support.FakeTransport()
        self.in_battle = False

    def user_agent(self):
        return 'otmetki/test'


class ModelTest(unittest.TestCase):

    def test_the_switch_and_the_marked_kinds(self):
        assert SETTINGS == ('hangar_preset_advisor',)
        assert SCHEMA.defaults == {'equipment': True, 'directives': True, 'consumables': False}

    def test_the_site_read_names_only_the_tank(self):
        assert advice_path(TANK) == '/tanks/2849/build-advice'

    def test_an_answer_is_read_for_its_own_tank_only(self):
        assert parse_advice(ANSWER, TANK)['equipment'] == [1001, 1002, 1003]
        assert parse_advice(ANSWER, OTHER_TANK) is None
        assert parse_advice('broken', TANK) is None

    def test_a_small_sample_marks_nothing(self):
        advice = parse_advice(dict(ANSWER, isEnough=False), TANK)

        assert advice == {'equipment': [], 'directives': [], 'consumables': []}

    def test_ids_that_are_not_positive_ints_are_dropped(self):
        advice = parse_advice(dict(ANSWER, equipment=[1001, 0, True, 'x', 1002]), TANK)

        assert advice['equipment'] == [1001, 1002]

    def test_the_kinds_switched_on_decide_what_is_marked(self):
        advice = parse_advice(ANSWER, TANK)

        assert advised_ids(advice, SCHEMA.defaults) == [1001, 1002, 1003, 2001]
        assert advised_ids(advice, {'consumables': True}) == [3001, 3002, 3003]
        assert advised_ids(None, SCHEMA.defaults) == []

    def test_the_page_payload_is_compact_json(self):
        payload = json.loads(page_payload(TANK, [1001], u'Сборка сайта'))

        assert payload == {'v': 1, 'tankId': TANK, 'items': [1001], 'label': u'Сборка сайта'}

    def test_the_cache_keeps_an_answer_and_retries_a_failure_later(self):
        cache = AdviceCache(ttl=100, retry_after=10)

        assert cache.is_due(TANK, 0)
        cache.asking(TANK, 0)
        assert not cache.is_due(TANK, 5)
        assert cache.is_due(TANK, 10)
        cache.put(TANK, {'equipment': [1]}, 10)
        assert not cache.is_due(TANK, 50)
        assert cache.is_due(TANK, 111)
        assert cache.get(TANK) == {'equipment': [1]}

    def test_ru_and_en_strings_match(self):
        assert set(STRINGS['ru']) == set(STRINGS['en'])


class PresetAdvisorClientTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in STUBBED}
        self.vehicle = CurrentVehicle(Vehicle(TANK))
        self.stock = stock_model_class()
        sys.modules['BigWorld'] = module('BigWorld')
        sys.modules['CurrentVehicle'] = module('CurrentVehicle', g_currentVehicle=self.vehicle)
        sys.modules['frameworks'] = module('frameworks')
        sys.modules['frameworks.wulf'] = module('frameworks.wulf', ViewModel=ViewModel)
        sys.modules['openwg_gameface'] = module('openwg_gameface', gf_mod_inject=gf_mod_inject)
        self.parents = _support.stub_parents(STOCK_MODULE)
        sys.modules[STOCK_MODULE] = module(STOCK_MODULE, AmmunitionSetupViewModel=self.stock)
        hud = importlib.import_module('otmetki.core.client.hud')
        hud._state['config'] = ComponentConfig(MemoryFile())
        self.client = importlib.import_module('otmetki.features.preset_advisor.client')
        self.app = App()
        self.feature = self.client.PresetAdvisor(self.app, clock=lambda: 1000.0)

    def tearDown(self):
        for name, value in self.saved.items():
            if value is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = value
        _support.drop_modules(self.parents)
        _support.forget_modules(DROPPED_PREFIXES)

    def payload(self, model):
        return json.loads(model.prop('otmetkiPresetAdvisor').prop('payload'))

    def test_the_stock_model_gets_the_script_and_the_payload(self):
        model = self.stock()

        assert model.capacity == 11
        assert model.prop('ModInjectModel') == {
            'name': 'OtmetkiPresetAdvisor',
            'scripts': ['coui://gui/gameface/mods/triotmetki/ui/preset_advisor.js'],
        }
        assert self.payload(model)['items'] == []

    def test_the_hangar_asks_the_site_once_and_marks_the_answer(self):
        model = self.stock()

        self.app.bus.emit('hangar')
        self.app.bus.emit('hangar')

        assert len(self.app.transport.requests) == 1
        request = self.app.transport.requests[0]
        assert request['method'] == 'GET'
        assert request['url'] == 'https://api.triotmetki.ru/tanks/2849/build-advice'
        assert request['body'] is None

        self.app.transport.respond(200, json.dumps(ANSWER).encode('utf-8'))

        assert self.payload(model)['items'] == [1001, 1002, 1003, 2001]
        assert self.payload(self.stock())['items'] == [1001, 1002, 1003, 2001]

    def test_a_failed_read_marks_nothing(self):
        model = self.stock()
        self.app.bus.emit('hangar')

        self.app.transport.respond(500, b'')
        assert self.payload(model)['items'] == []

        self.app.transport.respond(200, b'not json')
        assert self.payload(model)['items'] == []

    def test_switched_off_it_asks_nothing_and_marks_nothing(self):
        self.app.config.enabled = False

        self.app.bus.emit('hangar')

        assert self.app.transport.requests == []
        assert self.payload(self.stock())['items'] == []

    def test_changing_the_tank_asks_for_the_new_one(self):
        self.app.bus.emit('hangar')
        self.vehicle.item = Vehicle(OTHER_TANK)
        self.vehicle.onChanged()

        urls = [request['url'] for request in self.app.transport.requests]
        assert urls == ['https://api.triotmetki.ru/tanks/2849/build-advice', 'https://api.triotmetki.ru/tanks/4385/build-advice']


if __name__ == '__main__':
    unittest.main()

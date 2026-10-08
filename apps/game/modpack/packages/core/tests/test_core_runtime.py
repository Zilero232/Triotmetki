# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import codecs
import importlib
import itertools
import os
import shutil
import sys
import tempfile
import types
import unittest

import _support  # noqa: F401
from otmetki.core import hooks, log, registry
from otmetki.core.client.game import values_by_name
from otmetki.core.errors import ReasonError
from otmetki.core.events import EVENT_HIT_VIEWER_BATTLES, EventBus, hit_viewer_battles
from otmetki.core.i18n import Catalog, Translator, resolve_language
from otmetki.core.format import format_number, format_percent, format_signed, single_spaces, strip_tags
from otmetki.core.settings import Schema, Settings, fix
from otmetki.core.storage import JsonFile, account_file

FEATURE_IDS = ('marks_panel', 'session_stats', 'replay_upload')
INIT_ORDERS = list(itertools.permutations(('host',) + FEATURE_IDS))
KIND_NAMES = (('DAMAGE', 'damage'), ('STUN', 'stun'), ('TANKING', 'blocked'))


class FakeEvent(object):

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


def event_owner():
    class Owner(object):
        onChanged = FakeEvent()

    return Owner


def event_holder(name):
    return type(str('Holder'), (object,), {name: FakeEvent()})()


def raise_value_error(value):
    raise ValueError(value)


def raise_runtime_error(value):
    raise RuntimeError(value)


def greeting_target():
    class Target(object):
        def greet(self, name):
            return 'hi ' + name

    @hooks.override(Target, 'greet')
    def greet(original, self, name):
        return original(self, name).upper()

    return Target


def overridden_child():
    class Base(object):
        def value(self):
            return 1

        @staticmethod
        def twice(x):
            return 2 * x

    class Child(Base):
        pass

    hooks.override(Child, 'value')(lambda original, self: original(self) + 10)
    hooks.override(Child, 'twice')(lambda original, x: original(x) + 1)
    return Base, Child


def settings_schema():
    return Schema(
        {'on': True, 'count': 5, 'mode': 'a', 'url': 'x'},
        choices={'mode': ('a', 'b')},
        limits={'count': (1, 9)},
        normalizers={'url': lambda value: value.upper() if value.startswith('h') else None},
    )


def two_language_catalog():
    return Catalog({'ru': {'a': u'А'}, 'en': {'a': u'A'}}, {'ru': {'b': u'Б {x}'}})


class EventBusTest(unittest.TestCase):

    def bus_with_a_broken_handler_in_the_middle(self):
        self.errors = []
        self.calls = []
        bus = EventBus(on_error=self.errors.append)
        bus.on('x', lambda value: self.calls.append(('a', value)))
        bus.on('x', raise_value_error)
        bus.on('x', lambda value: self.calls.append(('c', value)))
        return bus

    def test_handlers_run_in_order_past_a_failing_one(self):
        bus = self.bus_with_a_broken_handler_in_the_middle()

        bus.emit('x', 1)

        self.assertEqual(self.calls, [('a', 1), ('c', 1)])

    def test_a_failing_handler_is_reported(self):
        bus = self.bus_with_a_broken_handler_in_the_middle()

        bus.emit('x', 1)

        self.assertEqual(self.errors, ['x handler'])

    def test_a_handler_subscribed_twice_runs_once(self):
        bus = EventBus()
        calls = []
        handler = calls.append
        bus.on('x', handler)
        bus.on('x', handler)

        bus.emit('x', 1)

        self.assertEqual(calls, [1])

    def test_an_unsubscribed_handler_no_longer_runs(self):
        bus = EventBus()
        calls = []
        handler = calls.append
        bus.on('x', handler)
        bus.on('x', handler)

        bus.off('x', handler)
        bus.emit('x', 2)

        self.assertEqual(calls, [])

    def test_a_handler_subscribed_twice_is_gone_after_one_off(self):
        bus = EventBus()
        calls = []
        handler = calls.append
        bus.on('x', handler)
        bus.on('x', handler)

        bus.off('x', handler)
        bus.emit('x', 1)

        self.assertEqual(calls, [])

    def test_emitting_an_event_nobody_listens_to_does_nothing(self):
        bus = EventBus()

        result = bus.emit('nobody', 1)

        self.assertIsNone(result)


class HitViewerBattlesTest(unittest.TestCase):

    def test_the_battles_are_the_hit_viewers_answer(self):
        bus = EventBus()
        bus.on(EVENT_HIT_VIEWER_BATTLES, lambda reply: reply(['1', '2']))

        assert hit_viewer_battles(bus) == frozenset(['1', '2'])

    def test_without_the_hit_viewer_there_are_none(self):
        assert hit_viewer_battles(EventBus()) == frozenset()


class SubscriptionsTest(unittest.TestCase):

    def test_a_subscription_receives_the_event(self):
        owner = event_owner()
        calls = []
        hooks.Subscriptions().add(owner, 'onChanged', calls.append)

        owner.onChanged(1)

        self.assertEqual(calls, [1])

    def test_cleared_subscriptions_receive_nothing(self):
        owner = event_owner()
        calls = []
        subscriptions = hooks.Subscriptions()
        subscriptions.add(owner, 'onChanged', calls.append)

        subscriptions.clear()
        owner.onChanged(2)

        self.assertEqual(calls, [])


class VehicleChangedTest(unittest.TestCase):

    def setUp(self):
        self.saved = {name: sys.modules.get(name) for name in (
            'CurrentVehicle', 'PlayerEvents', 'otmetki.core.client.game')}
        self.vehicle = event_holder('onChanged')
        self.player_events = event_holder('onAccountShowGUI')
        current_vehicle = types.ModuleType(str('CurrentVehicle'))
        current_vehicle.g_currentVehicle = self.vehicle
        player_events = types.ModuleType(str('PlayerEvents'))
        player_events.g_playerEvents = self.player_events
        sys.modules['CurrentVehicle'] = current_vehicle
        sys.modules['PlayerEvents'] = player_events
        sys.modules.pop('otmetki.core.client.game', None)
        self.game = importlib.import_module('otmetki.core.client.game')

    def tearDown(self):
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def test_a_callback_hears_the_selection_change(self):
        calls = []
        self.game.on_vehicle_changed(lambda: calls.append(1), 'test')

        self.vehicle.onChanged()

        self.assertEqual(calls, [1])

    def test_a_callback_hears_the_change_after_the_client_cleared_the_subscribers(self):
        calls = []
        self.game.on_vehicle_changed(lambda: calls.append(1), 'test')
        self.vehicle.onChanged.handlers = []

        self.player_events.onAccountShowGUI({})
        self.vehicle.onChanged()

        self.assertEqual(calls, [1])

    def test_returning_to_the_hangar_subscribes_once(self):
        calls = []
        self.game.on_vehicle_changed(lambda: calls.append(1), 'test')

        self.player_events.onAccountShowGUI({})
        self.player_events.onAccountShowGUI({})
        self.vehicle.onChanged()

        self.assertEqual(calls, [1])


class OverrideTest(unittest.TestCase):

    def test_override_wraps_the_original(self):
        target = greeting_target()

        self.assertEqual(target().greet('a'), 'HI A')

    def test_restore_reports_the_override_it_removed(self):
        target = greeting_target()

        self.assertTrue(hooks.restore(target, 'greet'))

    def test_restore_puts_the_original_back(self):
        target = greeting_target()

        hooks.restore(target, 'greet')

        self.assertEqual(target().greet('a'), 'hi a')

    def test_restore_without_an_override_reports_nothing_removed(self):
        target = greeting_target()
        hooks.restore(target, 'greet')

        self.assertFalse(hooks.restore(target, 'greet'))

    def test_override_of_an_inherited_method_changes_only_the_child(self):
        base, child = overridden_child()

        self.assertEqual(child().value(), 11)
        self.assertEqual(base().value(), 1)

    def test_override_of_a_static_method_wraps_it(self):
        _, child = overridden_child()

        self.assertEqual(child().twice(3), 7)

    def test_restore_of_an_inherited_method_leaves_the_child_inheriting_again(self):
        _, child = overridden_child()

        restored = hooks.restore(child, 'value')

        self.assertTrue(restored)
        self.assertEqual(child().value(), 1)
        self.assertNotIn('value', child.__dict__)

    def test_restore_of_a_static_method_puts_the_original_back(self):
        _, child = overridden_child()

        restored = hooks.restore(child, 'twice')

        self.assertTrue(restored)
        self.assertEqual(child.twice(3), 6)


class HookGuardTest(unittest.TestCase):

    def setUp(self):
        self.logged = []
        self.saved = hooks.log_exception, log.log_exception
        hooks.log_exception = self.logged.append
        log.log_exception = self.logged.append

    def tearDown(self):
        hooks.log_exception, log.log_exception = self.saved

    def owner_with_a_broken_subscriber(self):
        owner = event_owner()
        self.calls = []
        self.guarded = hooks.subscribe(owner, 'onChanged', raise_runtime_error)
        hooks.subscribe(owner, 'onChanged', self.calls.append)
        return owner

    def test_the_other_subscribers_still_run_after_a_failing_one(self):
        owner = self.owner_with_a_broken_subscriber()

        owner.onChanged(1)

        self.assertEqual(self.calls, [1])

    def test_a_failing_subscriber_is_logged(self):
        owner = self.owner_with_a_broken_subscriber()

        owner.onChanged(1)

        self.assertEqual(len(self.logged), 1)

    def test_unsubscribe_removes_the_guarded_handler(self):
        owner = self.owner_with_a_broken_subscriber()

        removed = hooks.unsubscribe(owner, 'onChanged', self.guarded)

        self.assertTrue(removed)
        self.assertEqual(len(owner.onChanged.handlers), 1)

    def target_failing_before_the_original(self):
        class Target(object):
            def value(self):
                return 7

        hooks.override(Target, 'value')(lambda original, target: raise_runtime_error('before'))
        return Target

    def test_override_failing_before_the_original_falls_back_to_it(self):
        target = self.target_failing_before_the_original()

        self.assertEqual(target().value(), 7)

    def test_override_failing_before_the_original_is_logged(self):
        target = self.target_failing_before_the_original()

        target().value()

        self.assertEqual(self.logged, ['override value'])

    def target_failing_after_the_original(self):
        self.original_calls = []
        original_calls = self.original_calls

        class Target(object):
            def value(self):
                original_calls.append(1)
                return 7

        def broken(original, target):
            original(target)
            raise RuntimeError('after')

        hooks.override(Target, 'value')(broken)
        return Target

    def test_override_failing_after_the_original_keeps_its_result(self):
        target = self.target_failing_after_the_original()

        self.assertEqual(target().value(), 7)

    def test_override_failing_after_the_original_does_not_run_it_again(self):
        target = self.target_failing_after_the_original()

        target().value()

        self.assertEqual(self.original_calls, [1])

    def target_whose_original_raises(self):
        class Target(object):
            def value(self):
                raise KeyError('client')

        hooks.override(Target, 'value')(lambda original, target: original(target))
        return Target

    def test_override_lets_the_original_raise(self):
        target = self.target_whose_original_raises()

        self.assertRaises(KeyError, target().value)

    def test_an_error_of_the_original_is_not_logged_as_an_override_failure(self):
        target = self.target_whose_original_raises()

        with self.assertRaises(KeyError):
            target().value()

        self.assertEqual(self.logged, [])


class TickerTest(unittest.TestCase):

    def setUp(self):
        self.callbacks = []
        self.saved = {name: sys.modules.get(name) for name in ('BigWorld', 'otmetki.core.client.timer')}
        self.cancelled = []
        stub = types.ModuleType(str('BigWorld'))
        stub.callback = self.schedule
        stub.cancelCallback = self.cancel
        sys.modules['BigWorld'] = stub
        sys.modules.pop('otmetki.core.client.timer', None)
        self.timer = importlib.import_module('otmetki.core.client.timer')
        self.saved_log = self.timer.log_exception, self.timer.log
        self.timer.log_exception = lambda context: None
        self.logged = []
        self.timer.log = self.logged.append

    def schedule(self, delay, callback):
        self.callbacks.append(callback)
        return len(self.callbacks) + len(self.cancelled) * 1000

    def cancel(self, callback_id):
        self.cancelled.append(callback_id)
        self.callbacks = []

    def tearDown(self):
        self.timer.log_exception, self.timer.log = self.saved_log
        for name, module in self.saved.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module

    def run_callbacks(self, rounds=1):
        for _ in range(rounds):
            pending = self.callbacks
            self.callbacks = []
            for callback in pending:
                callback()

    def set_game_time(self, seconds):
        sys.modules['BigWorld'].time = lambda: seconds

    def ticker_failing_once_then_stopping_on_the_third_tick(self):
        self.ticks = []

        def on_tick():
            self.ticks.append(1)
            if len(self.ticks) == 1:
                raise RuntimeError('tick')
            return len(self.ticks) < 3

        return self.timer.Ticker(1.0, on_tick)

    def ticker_recording_elapsed(self):
        self.set_game_time(10.0)
        self.seen = []
        ticker = self.timer.Ticker(0.1, lambda: self.seen.append(round(ticker.elapsed(), 3)))
        return ticker

    def test_a_failing_tick_does_not_stop_the_ticker(self):
        ticker = self.ticker_failing_once_then_stopping_on_the_third_tick()

        ticker.start()
        self.run_callbacks(rounds=5)

        self.assertEqual(len(self.ticks), 3)

    def test_the_ticker_stops_when_the_handler_returns_false(self):
        ticker = self.ticker_failing_once_then_stopping_on_the_third_tick()

        ticker.start()
        self.run_callbacks(rounds=5)

        self.assertFalse(ticker.running)

    def test_a_tick_failing_every_time_stops_after_the_cap(self):
        ticker = self.timer.Ticker(1.0, lambda: 1 // 0)

        ticker.start()
        self.run_callbacks(rounds=self.timer.MAX_FAILURES + 5)

        self.assertFalse(ticker.running)

    def test_a_tick_stopped_for_failing_says_so_once(self):
        ticker = self.timer.Ticker(1.0, lambda: 1 // 0)

        ticker.start()
        self.run_callbacks(rounds=self.timer.MAX_FAILURES + 5)

        self.assertEqual(len(self.logged), 1)

    def test_a_success_resets_the_failure_count(self):
        calls = []

        def on_tick():
            calls.append(1)
            if len(calls) % 2:
                raise RuntimeError('tick')

        ticker = self.timer.Ticker(1.0, on_tick)
        ticker.start()
        self.run_callbacks(rounds=self.timer.MAX_FAILURES * 3)

        self.assertTrue(ticker.running)

    def test_stop_cancels_the_pending_callback(self):
        ticker = self.timer.Ticker(1.0, lambda: None)
        ticker.start()

        ticker.stop()

        self.assertEqual(len(self.cancelled), 1)

    def test_stop_after_the_last_tick_cancels_nothing(self):
        ticker = self.timer.Ticker(1.0, lambda: False)
        ticker.start()
        self.run_callbacks()

        ticker.stop()

        self.assertEqual(self.cancelled, [])

    def test_a_restart_never_runs_two_chains(self):
        ticks = []
        ticker = self.timer.Ticker(1.0, lambda: ticks.append(1))

        ticker.start()
        stale = self.callbacks[0]
        ticker.stop()
        ticker.start()
        stale()
        self.run_callbacks(rounds=2)

        self.assertEqual(len(ticks), 2)

    def test_a_tick_that_stops_the_ticker_schedules_nothing(self):
        ticker = self.timer.Ticker(1.0, lambda: ticker.stop())

        ticker.start()
        self.run_callbacks()

        self.assertEqual(self.callbacks, [])

    def test_a_tick_that_restarts_the_ticker_leaves_one_chain(self):
        ticks = []

        def on_tick():
            ticks.append(1)
            if len(ticks) == 1:
                ticker.stop()
                ticker.start()

        ticker = self.timer.Ticker(1.0, on_tick)
        ticker.start()
        self.run_callbacks()

        self.assertEqual(len(self.callbacks), 1)

    def test_elapsed_is_the_game_time_between_ticks(self):
        ticker = self.ticker_recording_elapsed()

        ticker.start()
        self.set_game_time(10.133)
        self.run_callbacks()
        self.set_game_time(10.25)
        self.run_callbacks()

        self.assertEqual(self.seen, [0.133, 0.117])

    def test_restart_elapsed_counts_from_now(self):
        ticker = self.ticker_recording_elapsed()
        ticker.start()
        self.set_game_time(10.3)

        ticker.restart_elapsed()
        self.set_game_time(10.35)
        self.run_callbacks()

        self.assertEqual(self.seen, [0.05])

    def test_elapsed_falls_back_to_the_interval_without_a_clock(self):
        seen = []
        ticker = self.timer.Ticker(0.5, lambda: seen.append(ticker.elapsed()))

        ticker.start()
        self.run_callbacks()

        self.assertEqual(seen, [0.5])


class Owner(object):

    def __init__(self):
        self.onEvent = Event()


class Event(object):

    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self

    def __isub__(self, handler):
        self.handlers.remove(handler)
        return self


class BattleHooksTest(unittest.TestCase):

    def setUp(self):
        self.callbacks = []
        prefix = 'otmetki.core.client.battle'
        self.saved = {name: module for name, module in sys.modules.items()
                          if name == 'BigWorld' or name.startswith(prefix)}
        for name in list(self.saved):
            sys.modules.pop(name, None)
        stub = types.ModuleType(str('BigWorld'))
        stub.callback = lambda delay, callback: self.callbacks.append(callback)
        sys.modules['BigWorld'] = stub
        self.hooks_module = importlib.import_module('otmetki.core.client.battle.hooks')

    def tearDown(self):
        _support.forget_modules(('otmetki.core.client.battle',))
        sys.modules.pop('BigWorld', None)
        sys.modules.update(self.saved)

    def run_callbacks(self):
        pending = self.callbacks
        self.callbacks = []
        for callback in pending:
            callback()

    def broken_report(self, name, attached):
        raise RuntimeError('report')

    def test_a_failing_report_stays_inside_the_hook(self):
        hooks = self.hooks_module.BattleHooks()

        hooks.add(Owner, 'onEvent', lambda: None, on_result=self.broken_report)

        self.assertEqual(len(hooks.items), 1)

    def test_a_failing_report_after_a_retry_stays_inside_the_callback(self):
        owners = [None, Owner()]
        hooks = self.hooks_module.BattleHooks()
        hooks.add(lambda: owners.pop(0), 'onEvent', lambda: None, on_result=self.broken_report)

        self.run_callbacks()

        self.assertEqual(len(hooks.items), 1)


class CoreHelpersTest(unittest.TestCase):

    def test_values_by_name_skips_names_the_client_lacks(self):
        holder = type(str('KINDS'), (object,), {'DAMAGE': 1, 'TANKING': 7})

        values = values_by_name(holder, KIND_NAMES)

        self.assertEqual(values, {1: 'damage', 7: 'blocked'})

    def test_values_by_name_of_a_missing_holder_is_empty(self):
        self.assertEqual(values_by_name(None, (('DAMAGE', 'damage'),)), {})

    def test_strip_tags_replaces_every_tag(self):
        self.assertEqual(strip_tags(u'<font color="#fff">a</font>b', u' '), u' a b')

    def test_single_spaces_collapses_and_trims_whitespace(self):
        self.assertEqual(single_spaces(u'  a \n\t b  '), u'a b')

    def test_reason_error_carries_its_reason(self):
        self.assertEqual(ReasonError('code').reason, 'code')

    def test_reason_error_is_a_value_error(self):
        self.assertIsInstance(ReasonError('code'), ValueError)


class RegistryTest(unittest.TestCase):

    def setUp(self):
        self.saved = registry.log, registry.log_exception
        registry.log = lambda message: None
        registry.log_exception = lambda message: None
        registry.reset()

    def tearDown(self):
        registry.log, registry.log_exception = self.saved
        registry.reset()

    def factory_for(self, feature_id):
        def factory(app):
            self.created.append((feature_id, app))
            return feature_id
        return factory

    def init_in_order(self, order):
        registry.reset()
        self.host = object()
        self.created = []
        answers = []
        for step in order:
            if step == 'host':
                answers.append(registry.registry().bind(self.host))
            else:
                answers.append(registry.registry().register(step, self.factory_for(step)))
        return answers

    def test_every_init_step_is_accepted_in_any_order(self):
        for order in INIT_ORDERS:
            answers = self.init_in_order(order)

            self.assertEqual(answers, [True, True, True, True], order)

    def test_every_feature_is_created_once_with_the_host_in_any_order(self):
        for order in INIT_ORDERS:
            self.init_in_order(order)

            expected = [('marks_panel', self.host), ('replay_upload', self.host), ('session_stats', self.host)]
            self.assertEqual(sorted(self.created), expected, order)

    def test_every_feature_is_reachable_by_its_id_in_any_order(self):
        for order in INIT_ORDERS:
            self.init_in_order(order)

            for feature_id in FEATURE_IDS:
                self.assertEqual(registry.registry().get(feature_id), feature_id, order)

    def test_a_feature_registered_twice_is_refused(self):
        for order in INIT_ORDERS:
            self.init_in_order(order)

            registered = registry.registry().register('marks_panel', self.factory_for('marks_panel'))

            self.assertFalse(registered, order)

    def test_binding_the_same_host_again_is_accepted(self):
        for order in INIT_ORDERS:
            self.init_in_order(order)

            self.assertTrue(registry.registry().bind(self.host), order)

    def test_binding_another_host_is_refused(self):
        for order in INIT_ORDERS:
            self.init_in_order(order)

            self.assertFalse(registry.registry().bind(object()), order)

    def bind_a_broken_and_a_fine_feature(self):
        registry.registry().register('broken', raise_runtime_error)
        registry.registry().register('fine', lambda app: 'ok')
        registry.registry().bind(object())

    def test_a_failing_feature_is_left_out(self):
        self.bind_a_broken_and_a_fine_feature()

        self.assertIsNone(registry.registry().get('broken'))

    def test_a_failing_feature_does_not_block_others(self):
        self.bind_a_broken_and_a_fine_feature()

        self.assertEqual(registry.registry().get('fine'), 'ok')

    def test_lazy_singleton(self):
        self.assertIs(registry.registry(), registry.registry())


class SettingsSchemaTest(unittest.TestCase):

    def test_values_are_coerced_to_the_schema(self):
        raw = {'on': 'yes', 'count': 99.5, 'mode': 'c', 'url': ' http ', 'other': 1}

        settings = Settings(raw, schema=settings_schema())

        self.assertEqual(settings.to_dict(), {'on': True, 'count': 9, 'mode': 'a', 'url': 'HTTP'})

    def test_update_reports_only_the_keys_that_took_a_valid_value(self):
        settings = Settings({}, schema=settings_schema())

        changed = settings.update({'mode': 'b', 'url': 'ftp'})

        self.assertEqual(changed, ['mode'])

    def test_a_number_that_is_not_finite_is_ignored(self):
        settings = Settings({}, schema=settings_schema())

        changed = settings.update({'count': float('inf'), 'mode': 'b'})

        self.assertEqual(changed, ['mode'])

    def test_a_number_that_is_not_a_number_is_ignored(self):
        settings = Settings({}, schema=settings_schema())

        changed = settings.update({'count': float('nan')})

        self.assertEqual(changed, [])

    def test_a_switched_off_flag_is_not_enabled(self):
        settings = Settings({'on': False}, schema=settings_schema())

        self.assertFalse(settings.is_enabled('on'))

    def test_a_fixed_key_leaves_the_file_and_keeps_its_value(self):
        schema = fix(settings_schema(), {'count': 5})

        settings = Settings({'count': 9, 'mode': 'b'}, schema=schema)

        self.assertNotIn('count', settings.to_dict())
        self.assertEqual(settings.get('count'), 5)
        self.assertEqual(settings.update({'count': 7}), [])
        self.assertEqual(settings.get('mode'), 'b')


class I18nCatalogTest(unittest.TestCase):

    def test_a_key_missing_in_the_language_falls_back_to_russian(self):
        translate = Translator(two_language_catalog(), 'en')

        self.assertEqual(translate('b', x=1), u'Б 1')

    def test_an_unknown_key_reads_as_itself(self):
        translate = Translator(two_language_catalog(), 'en')

        self.assertEqual(translate('missing'), u'missing')

    def test_an_unknown_language_falls_back_to_russian(self):
        translate = Translator(two_language_catalog(), 'de')

        self.assertEqual(translate.language, 'ru')

    def test_auto_picks_russian_for_an_unsupported_client_language(self):
        self.assertEqual(resolve_language(two_language_catalog(), 'auto', 'uk'), 'ru')

    def test_auto_picks_the_client_language_by_its_prefix(self):
        self.assertEqual(resolve_language(two_language_catalog(), 'auto', 'en_US'), 'en')


class JsonFileTest(unittest.TestCase):

    def setUp(self):
        directory = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, directory)
        self.path = os.path.join(directory, 'nested', 'config.json')

    def test_a_missing_file_reads_as_the_default(self):
        storage = JsonFile(self.path, pretty=True)

        self.assertEqual(storage.read({}), {})

    def test_the_last_write_reads_back(self):
        storage = JsonFile(self.path, pretty=True)

        storage.write({'a': u'Три отметки'})
        storage.write({'a': u'Три отметки', 'b': 2})

        self.assertEqual(JsonFile(self.path).read(), {'a': u'Три отметки', 'b': 2})

    def test_a_broken_file_reads_as_the_fallback(self):
        JsonFile(self.path).write({})
        with open(self.path, 'w') as handle:
            handle.write('{broken')

        self.assertEqual(JsonFile(self.path).read('fallback'), 'fallback')

    def test_a_file_saved_with_a_byte_order_mark_reads(self):
        JsonFile(self.path).write({})
        with open(self.path, 'wb') as handle:
            handle.write(codecs.BOM_UTF8 + b'{"a": 1}')

        self.assertEqual(JsonFile(self.path).read('fallback'), {'a': 1})

    def test_account_file_names_one_account_per_file(self):
        stored = account_file(os.path.join('configs', 'otmetki'), 'hits_%d.json', 12345)

        self.assertEqual(stored.path, os.path.join('configs', 'otmetki', 'hits_12345.json'))
        self.assertFalse(stored.pretty)


class NumberFormatTest(unittest.TestCase):

    def test_a_number_is_rounded_and_grouped_by_thousands(self):
        self.assertEqual(format_number(1234567.4), u'1 234 567')

    def test_a_missing_number_reads_as_a_dash(self):
        self.assertEqual(format_number(None), u'-')

    def test_a_percent_has_two_decimals(self):
        self.assertEqual(format_percent(60), u'60.00%')

    def test_a_positive_signed_number_gets_a_plus(self):
        self.assertEqual(format_signed(1500), u'+1 500')

    def test_zero_and_negative_signed_numbers_keep_their_own_sign(self):
        self.assertEqual([format_signed(0), format_signed(-2.5, True)], [u'0', u'-2.50%'])

    def test_a_missing_signed_number_reads_as_the_given_text(self):
        self.assertEqual([format_signed(None), format_signed(None, True, u'')], [u'-', u''])


if __name__ == '__main__':
    unittest.main()

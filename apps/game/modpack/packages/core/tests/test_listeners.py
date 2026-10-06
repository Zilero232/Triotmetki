from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.core.client.lobby_view import LobbyViewWatch
from otmetki.core.client.moe import MoeService
from otmetki.core.events import EventBus, Listeners
from otmetki.core.settings import Schema, Settings


def failing(*args):
    raise RuntimeError('listener')


def quiet_listeners(context):
    errors = []
    return Listeners(context, on_error=errors.append), errors


class ListenersTest(unittest.TestCase):

    def test_callbacks_run_in_the_order_they_were_added(self):
        heard = []
        listeners, _ = quiet_listeners('test')
        listeners.add(lambda value: heard.append(('first', value)))
        listeners.add(lambda value: heard.append(('second', value)))

        listeners.notify(1)

        self.assertEqual(heard, [('first', 1), ('second', 1)])

    def test_a_callback_added_twice_runs_once(self):
        heard = []
        listeners, _ = quiet_listeners('test')
        listeners.add(heard.append)
        listeners.add(heard.append)

        listeners.notify(1)

        self.assertEqual(heard, [1])

    def test_a_failing_callback_does_not_stop_the_next_one(self):
        heard = []
        listeners, _ = quiet_listeners('test')
        listeners.add(failing)
        listeners.add(heard.append)

        listeners.notify(1)

        self.assertEqual(heard, [1])

    def test_a_failing_callback_is_reported_with_its_context(self):
        listeners, errors = quiet_listeners('lobby view listener')
        listeners.add(failing)

        listeners.notify()

        self.assertEqual(errors, ['lobby view listener'])

    def test_a_removed_callback_no_longer_runs(self):
        heard = []
        listeners, _ = quiet_listeners('test')
        listeners.add(heard.append)

        listeners.remove(heard.append)
        listeners.notify(1)

        self.assertEqual(heard, [])


class FakeWindows(object):

    def __init__(self):
        self.windows = []

    def findWindows(self, predicate):
        return list(self.windows)


class Window(object):
    layer = 3
    windowStatus = 1


class LobbyViewListenersTest(unittest.TestCase):

    def test_a_failing_listener_does_not_keep_the_change_from_the_next(self):
        heard = []
        watch = LobbyViewWatch()
        watch.manager = FakeWindows()
        watch.blocking = {Window.layer}
        watch.listeners = Listeners('lobby view listener', on_error=lambda context: None)
        watch.listeners.add(failing)
        watch.listeners.add(heard.append)
        watch.manager.windows.append(Window())

        watch.check()

        self.assertEqual(heard, [False])


class Transport(object):

    def __init__(self):
        self.requests = []

    def request(self, method, url, headers, body, callback):
        self.requests.append(callback)


class Config(object):

    def endpoint(self, path):
        return 'https://api.example/' + path


class App(object):

    def __init__(self):
        self.bus = EventBus()
        self.state = {}
        self.transport = Transport()
        self.config = Config()

    def register_state(self, key, dump):
        pass

    def user_agent(self):
        return 'otmetki/test'

    def current_credentials(self):
        return None


class MoeListenersTest(unittest.TestCase):

    def test_a_failing_listener_does_not_keep_the_curve_from_the_next(self):
        heard = []
        service = MoeService(App())
        service.listeners = Listeners('marks data listener', on_error=lambda context: None)
        service.listen(failing)
        service.listen(heard.append)
        service.ensure(1)

        service.app.transport.requests[0](404, b'', {})

        self.assertEqual(heard, [1])


class SettingsRevisionTest(unittest.TestCase):

    def test_a_change_moves_the_revision(self):
        settings = Settings(None, Schema({'follow': 'instant'}))
        before = settings.revision

        settings.update({'follow': 'smooth'})

        self.assertGreater(settings.revision, before)

    def test_an_update_that_changes_nothing_keeps_the_revision(self):
        settings = Settings(None, Schema({'follow': 'instant'}))
        before = settings.revision

        settings.update({'follow': 'instant', 'unknown': 1})

        self.assertEqual(settings.revision, before)

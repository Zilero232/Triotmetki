from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import session_provider
from ....core.client.game import client_attr, service
from ....core.client.native import settings_core
from ....core.compat import call
from .constants import LOBBY_CONTEXT, LOBBY_CONTEXT_MODULE, NOTIFIER_CONTROLLER, NOTIFIER_OPTION, NOTIFIER_SERVER_FLAG


def _flag(value):
    return None if value is None else bool(value)


def _arena_has_notifier():
    controllers = getattr(session_provider(), 'dynamic', None)
    if controllers is None:
        return None
    return getattr(controllers, NOTIFIER_CONTROLLER, None) is not None


def _server_enables_notifier():
    context = service(client_attr(LOBBY_CONTEXT_MODULE, LOBBY_CONTEXT))
    return _flag(call(call(context, 'getServerSettings'), NOTIFIER_SERVER_FLAG))


def _option_on():
    return _flag(call(settings_core(), 'getSetting', None, NOTIFIER_OPTION))


def notifier_reads():
    return {'arena': _arena_has_notifier(), 'server': _server_enables_notifier(), 'option': _option_on()}

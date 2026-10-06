from __future__ import absolute_import, division, print_function, unicode_literals

# 'Watch': the client cannot play a replay inside a hangar session, so the hangar stores the request and restarts the
# client; on the next start, before the gameplay machine runs, the mod puts the client's own replay machine in its
# place (the path the client takes for a replay opened from Windows) and, when the replay ends, restarts into the
# login screen instead of quitting. RU 1.45 client source: BattleReplay.py :363-466, gameplay/machine.py :30-46,
# gameplay/delegator.py, game.py :90-205 (mods load in gui_personality.init, before ServiceLocator.gameplay.start).

import os
import sys
import time

from ....core.client.game import client_attr, service
from ....core.hooks import override
from ....core.log import log, log_exception, safe
from ....core.storage import JsonFile
from ..model import LAUNCH_FILE, launch_request, native_path, pending_launch, stop_on_teardown
from .constants import BOOT_CONFIG_DIR, FALLBACK_ENCODING, RESTART_DELAY_S


class _Session(object):
    path = None


def _store():
    return JsonFile(os.path.join(BOOT_CONFIG_DIR, LAUNCH_FILE))


def product_version():
    getter = client_attr('BigWorld', 'getProductVersion')
    if getter is None:
        return None
    try:
        return getter()
    except Exception:
        return None


def replay_busy():
    controller = client_attr('BattleReplay', 'g_replayCtrl')
    if controller is None:
        return False
    return bool(getattr(controller, 'isPlaying', False) or getattr(controller, 'isRecording', False))


def native_replay_path(path):
    return native_path(path, sys.getfilesystemencoding() or FALLBACK_ENCODING)


def can_play():
    can_restart = client_attr('BigWorld', 'restartGame') is not None
    return can_restart and client_attr('BattleReplay', 'g_replayCtrl') is not None


def request_play(path):
    import BigWorld
    _store().write(launch_request(os.path.abspath(path), time.time()))
    log('replay manager: restart to play %s' % os.path.basename(path))
    BigWorld.savePreferences()
    BigWorld.callback(RESTART_DELAY_S, BigWorld.restartGame)


@safe
def boot():
    store = _store()
    data = store.read(None)
    if data is None:
        return False
    store.delete()
    path = pending_launch(data, time.time(), os.path.isfile)
    if path is None:
        log('replay manager: stale play request dropped')
        return False
    try:
        _start(path)
    except Exception:
        _Session.path = None
        log_exception('replay manager: replay start')
        return False
    log('replay manager: playing %s' % os.path.basename(path))
    return True


def _start(path):
    from gameplay.listeners import PlayerEventsAdaptor
    from skeletons.gameplay import IGameplayLogic
    logic = service(IGameplayLogic)
    machine = _replay_machine(logic._GameplayLogic__machine)

    _Session.path = path
    _override_replay_controller()

    logic._GameplayLogic__machine = machine
    logic._GameplayLogic__adaptor = PlayerEventsAdaptor(machine)


def _replay_machine(previous):
    from gameplay.machine import BattleReplayMachine
    machine = BattleReplayMachine()
    for observer in list(previous._StateMachine__observers._observers):
        machine.connect(observer)
    return machine


# The overrides are registered by the decorator: the client calls them, nothing here does.
def _override_replay_controller():
    import BattleReplay
    controller = BattleReplay.BattleReplay

    @override(controller, 'getAutoStartFileName')
    def auto_start_name(call, self):
        return native_replay_path(_Session.path) if _Session.path else call(self)

    @override(controller, 'autoStartBattleReplay')
    def auto_start(call, self):
        return _restart_instead_of_quit(call, self)

    @override(controller, 'stop')
    def stop(call, self, *args, **kwargs):
        if stop_on_teardown(args, kwargs):
            return call(self, *args, **kwargs)
        return _restart_instead_of_quit(call, self, *args, **kwargs)


# The client quits after a replay it was started with; ours goes back to the login screen instead (not while the
# client is closing: `stop_on_teardown`).
def _restart_instead_of_quit(call, *args, **kwargs):
    import BigWorld
    if _Session.path is None:
        return call(*args, **kwargs)
    quit_game = BigWorld.quit
    BigWorld.quit = BigWorld.restartGame
    try:
        return call(*args, **kwargs)
    finally:
        BigWorld.quit = quit_game

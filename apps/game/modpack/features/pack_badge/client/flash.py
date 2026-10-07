from __future__ import absolute_import, division, print_function, unicode_literals

import weakref

import BigWorld

from ....core.client.game import battle_app, client_attr
from ....core.client.inject.watch import ViewWatch
from ....core.client.timer import Ticker
from ....core.log import log, safe
from ..model import library_action, status_lines
from ..model.constants import FLASH_CLEAR, FLASH_MARK, FLASH_REPAINT, LIBRARY_ADD, LIBRARY_SWF
from .constants import (
    BATTLE_APP,
    EVENTS_MODULE,
    FLASH_RETRIES,
    FLASH_RETRY_S,
    FULL_STATS_DOWN,
    GAME_EVENTS_MODULE,
    LIBRARIES_MODULE,
    LIBRARIES_NAME,
    PAGE_ALIASES,
    TAB_REPAINT_DELAY_S,
)


@safe
def set_library(is_on):
    libraries = client_attr(LIBRARIES_MODULE, LIBRARIES_NAME)
    if not isinstance(libraries, list):
        log('pack badge swf: %s.%s was not found, the library is not loaded' % (LIBRARIES_MODULE, LIBRARIES_NAME))
        return
    action = library_action(libraries, LIBRARY_SWF, is_on)
    if action is None:
        return
    if action == LIBRARY_ADD:
        libraries.append(LIBRARY_SWF)
    else:
        libraries.remove(LIBRARY_SWF)
    log('pack badge swf: %s %s in %s' % (action, LIBRARY_SWF, LIBRARIES_NAME))


def log_status(context, status):
    lines = status_lines(status)
    if not lines:
        # UNVERIFIED on Lesta 1.45: that the GFx bridge hands back the string the AS3 function returns.
        log('pack badge swf: %s: the page answered nothing' % context)
    for line in lines:
        log('pack badge swf: %s: %s' % (context, line))


class PageBridge(object):

    def __init__(self):
        self.page = None
        self.vehicle_ids = None
        self.attempts = 0
        self.tab_logged = False
        self.tab_listening = False
        self.watch = ViewWatch(BATTLE_APP, PAGE_ALIASES, battle_app, self._on_page, self._on_app_gone)
        self.retry = Ticker(FLASH_RETRY_S, self._retry)

    def start(self):
        self.tab_logged = False
        self.watch.start()
        self._listen_tab(True)

    def stop(self):
        self.retry.stop()
        self._listen_tab(False)
        self._call(FLASH_CLEAR)
        self.watch.stop()
        self.page = None
        self.vehicle_ids = None

    def show(self, vehicle_ids, reason):
        self.vehicle_ids = list(vehicle_ids)
        self.push(reason)

    def _on_page(self, view):
        self.page = weakref.ref(view)
        log('pack badge swf: battle page %s found' % getattr(view, 'alias', '?'))
        self.push('page found')

    def _on_app_gone(self):
        self.retry.stop()
        self.page = None

    def _flash(self):
        view = self.page() if self.page is not None else None
        return getattr(view, 'flashObject', None) if view is not None else None

    def _has(self, name):
        flash = self._flash()
        return flash is not None and hasattr(flash, name)

    def _call(self, name, *args):
        if not self._has(name):
            return None
        return getattr(self._flash(), name)(*args)

    @safe
    def push(self, reason):
        if self.vehicle_ids is None or self.page is None:
            return
        if not self._has(FLASH_MARK):
            self._wait()
            return
        self.retry.stop()
        status = self._call(FLASH_MARK, self.vehicle_ids)
        log_status('%s, %d marked vehicles' % (reason, len(self.vehicle_ids)), status)

    @safe
    def repaint(self):
        status = self._call(FLASH_REPAINT)
        if not self.tab_logged:
            self.tab_logged = True
            log_status('Tab opened', status)

    @safe
    def _listen_tab(self, is_on):
        game_event = client_attr(GAME_EVENTS_MODULE, 'GameEvent')
        bus = client_attr(EVENTS_MODULE, 'g_eventBus')
        scope = client_attr(EVENTS_MODULE, 'EVENT_BUS_SCOPE')
        if game_event is None or bus is None or scope is None or is_on == self.tab_listening:
            return
        self.tab_listening = is_on
        method = bus.addListener if is_on else bus.removeListener
        method(game_event.FULL_STATS, self._on_full_stats, scope=scope.BATTLE)

    @safe
    def _on_full_stats(self, event):
        if getattr(event, 'ctx', {}).get(FULL_STATS_DOWN):
            BigWorld.callback(TAB_REPAINT_DELAY_S, self.repaint)

    def _wait(self):
        if self.retry.running:
            return
        self.attempts = 0
        log('pack badge swf: waiting for %s on the battle page' % FLASH_MARK)
        self.retry.start()

    def _retry(self):
        self.attempts += 1
        if self._has(FLASH_MARK):
            log('pack badge swf: %s found after %d checks' % (FLASH_MARK, self.attempts))
            self.push('library loaded')
            return False
        if self.attempts >= FLASH_RETRIES or self.page is None:
            log('pack badge swf: the battle page has no %s: %s did not load (UNVERIFIED on Lesta 1.45)' % (
                FLASH_MARK, LIBRARY_SWF))
            return False
        return True

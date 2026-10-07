from __future__ import absolute_import, division, print_function, unicode_literals

import weakref

from ....core.client.game import battle_app, client_attr
from ....core.client.inject.watch import ViewWatch
from ....core.client.timer import Ticker
from ....core.log import log, safe
from ..model import library_action
from ..model.constants import FLASH_CLEAR, FLASH_MARK, LIBRARY_ADD, LIBRARY_SWF
from .constants import BATTLE_APP, FLASH_RETRIES, FLASH_RETRY_S, LIBRARIES_MODULE, LIBRARIES_NAME, PAGE_ALIASES


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


class PageBridge(object):

    def __init__(self):
        self.page = None
        self.vehicle_ids = None
        self.attempts = 0
        self.watch = ViewWatch(BATTLE_APP, PAGE_ALIASES, battle_app, self._on_page, self._on_app_gone)
        self.retry = Ticker(FLASH_RETRY_S, self._retry)

    def start(self):
        self.watch.start()

    def stop(self):
        self.retry.stop()
        self._call(FLASH_CLEAR)
        self.watch.stop()
        self.page = None
        self.vehicle_ids = None

    def show(self, vehicle_ids):
        self.vehicle_ids = list(vehicle_ids)
        self.push()

    def _on_page(self, view):
        self.page = weakref.ref(view)
        log('pack badge swf: battle page %s is loaded' % getattr(view, 'alias', '?'))
        self.push()

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
    def push(self):
        if self.vehicle_ids is None or self.page is None:
            return
        if not self._has(FLASH_MARK):
            self._wait()
            return
        self.retry.stop()
        # UNVERIFIED on Lesta 1.45: that the GFx bridge hands back the status string the AS3 function returns.
        status = self._call(FLASH_MARK, self.vehicle_ids)
        log('pack badge swf: sent %d marked vehicle ids, the page answered: %s' % (len(self.vehicle_ids), status))

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
            self.push()
            return False
        if self.attempts >= FLASH_RETRIES or self.page is None:
            log('pack badge swf: the battle page has no %s: %s did not load (UNVERIFIED on Lesta 1.45)' % (
                FLASH_MARK, LIBRARY_SWF))
            return False
        return True

from __future__ import absolute_import, division, print_function, unicode_literals

import os

from ....core.client.hotkey import Hotkey
from ....core.compat import to_native
from ....core.log import guarded, log, safe
from ....core.registry import registry
from ....core.storage import JsonFile
from .. import capture_ids, chosen_id, next_id, shot_name, stored_current, with_current
from ..constants import CAPTURE_FILE, NEXT_HOTKEY, SHOT_EXTENSION, SHOT_HOTKEY


def _installed_ids():
    return [feature_id for feature_id, _ in registry().factories]


class PreviewCapture(object):

    def __init__(self, app, config_dir):
        self.app = app
        self.file = JsonFile(os.path.join(config_dir, CAPTURE_FILE), pretty=True)
        self.hotkeys = (
            Hotkey(SHOT_HOTKEY[0], SHOT_HOTKEY[1], self.shoot),
            Hotkey(NEXT_HOTKEY[0], NEXT_HOTKEY[1], self.pick_next),
        )

    def start(self):
        for hotkey in self.hotkeys:
            hotkey.install()
        self._listen()
        log('preview capture: on (dev install), Ctrl+Shift+F12 shoots, Ctrl+Shift+F11 picks the next component')

    def _stored(self):
        return self.file.read({})

    def current(self):
        stored = self._stored()
        return chosen_id(capture_ids(stored, _installed_ids()), stored_current(stored))

    @safe
    def pick_next(self):
        stored = self._stored()
        ids = capture_ids(stored, _installed_ids())
        component_id = next_id(ids, chosen_id(ids, stored_current(stored)))
        self.file.write(with_current(stored, ids, component_id))
        log('preview capture: next shot is %s' % component_id)
        self.app.ui.notify(self.app.translate('capture_target', component_id=component_id))

    @guarded('preview capture: screenshot')
    def shoot(self):
        component_id = self.current()
        if component_id is None:
            log('preview capture: no component id to name the shot after')
            return
        import BigWorld
        name = shot_name(component_id)
        BigWorld.screenShot(to_native(SHOT_EXTENSION), to_native(name))
        log('preview capture: %s -> <client>/%s_NNN.%s' % (component_id, name, SHOT_EXTENSION))

    # RU 1.45 gui/shared/personality.py: the client's screenshot callback posts SCREEN_SHOT_MADE with the path.
    @guarded('preview capture: screenshot listener')
    def _listen(self):
        from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
        g_eventBus.addListener(events.GameEvent.SCREEN_SHOT_MADE, self._on_shot_made, EVENT_BUS_SCOPE.GLOBAL)

    @safe
    def _on_shot_made(self, event):
        log('preview capture: saved %s' % (getattr(event, 'ctx', None) or {}).get('path'))


# A developer tool: only a dev install (companion.config.is_dev_install) gets the hotkeys, never a release.
def start_capture(app, dev):
    if not dev:
        return None
    capture = PreviewCapture(app, app.config_dir)
    capture.start()
    return capture

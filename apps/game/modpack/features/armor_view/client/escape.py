from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.game import lobby_app
from ....core.log import guarded, safe


@guarded('armor view: lobby input manager')
def _input_manager():
    return getattr(lobby_app(), 'gameInputManager', None)


# The lobby's escape listeners take Esc before the stock game menu, as the hit viewer's page holds it.
class EscapeHold(object):

    def __init__(self, on_escape):
        self.on_escape = on_escape
        self.manager = None

    def hold(self):
        if self.manager is not None:
            return
        manager = _input_manager()
        if manager is None or not hasattr(manager, 'addEscapeListener'):
            return
        manager.addEscapeListener(self._escape)
        self.manager = manager

    @safe
    def release(self):
        manager = self.manager
        self.manager = None
        if manager is not None:
            manager.removeEscapeListener(self._escape)

    @safe
    def _escape(self, *args):
        self.on_escape()

from __future__ import absolute_import, division, print_function, unicode_literals


class EscapeGuard(object):
    def __init__(self, input_manager, on_escape):
        self.input_manager = input_manager
        self.on_escape = on_escape
        self.manager = None
        self.listener = self._escape

    @property
    def held(self):
        return self.manager is not None

    def hold(self):
        if self.manager is not None:
            return True
        manager = self.input_manager()
        if manager is None or not hasattr(manager, 'addEscapeListener') or not hasattr(manager, 'removeEscapeListener'):
            return False
        manager.addEscapeListener(self.listener)
        self.manager = manager
        return True

    def release(self):
        manager = self.manager
        self.manager = None
        if manager is not None:
            manager.removeEscapeListener(self.listener)

    def _escape(self, *args):
        if self.manager is not None:
            self.on_escape()

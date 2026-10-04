"""The modal stock views over the battle page (the Esc menu, the F1 help, the settings, a confirmation): our panels fade
while one is open.

RU 1.45 client source: gui/Scaleform/framework/managers/containers.py,
`ContainerManager.onViewAddedToContainer(container, pyView)` fires for every Scaleform view the battle app shows,
`View.isViewModal()` is its ViewSettings `isModal` (gui/Scaleform/daapi/view/battle/shared/__init__.py: INGAME_MENU on
TOP_WINDOW and INGAME_DETAILS_HELP on WINDOW are modal), and `DisposableEntity.onDispose(view)` fires when it closes.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....log import safe


class ModalWatch(object):

    def __init__(self, on_change):
        self.on_change = on_change
        self.manager = None
        self.views = set()

    @property
    def shown(self):
        return bool(self.views)

    def attach(self, page):
        self.detach()
        manager = getattr(getattr(page, 'app', None), 'containerManager', None)
        added = getattr(manager, 'onViewAddedToContainer', None)
        if added is None:
            return
        added += self._on_view_added
        self.manager = manager

    def detach(self):
        manager, self.manager = self.manager, None
        if manager is not None:
            manager.onViewAddedToContainer -= self._on_view_added
        for view in list(self.views):
            self._forget(view)
        self.views = set()

    @safe
    def _on_view_added(self, container, view):
        modal = getattr(view, 'isViewModal', None)
        if modal is None or not modal() or view in self.views:
            return
        self.views.add(view)
        view.onDispose += self._on_view_disposed
        self.on_change(True)

    @safe
    def _on_view_disposed(self, view):
        if view not in self.views:
            return
        self._forget(view)
        self.views.discard(view)
        self.on_change(self.shown)

    def _forget(self, view):
        disposed = getattr(view, 'onDispose', None)
        if disposed is not None:
            disposed -= self._on_view_disposed

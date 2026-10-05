from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.log import safe
from .constants import MODS_LIST_ICON, MODS_LIST_ID

try:
    from gui.modsListApi import g_modsListApi
except ImportError:
    g_modsListApi = None


# ModsList 1.6.01 (poliroid, MIT), the optional dependency the manager installs: addModification once, then
# updateModification(enabled=...) as the queue state changes. Lobby only, like BattleHits' entry.
class ModsListEntry(object):

    def __init__(self, on_open):
        self.on_open = on_open
        self.added = False
        self.available = None

    @safe
    def install(self, name, description, available):
        if g_modsListApi is None:
            return
        if not self.added:
            g_modsListApi.addModification(
                id=MODS_LIST_ID,
                name=name,
                description=description,
                icon=MODS_LIST_ICON,
                enabled=available,
                login=False,
                lobby=True,
                callback=self.on_open,
            )
            self.added = True
            self.available = available
            return
        self.set_available(available)

    @safe
    def set_available(self, available):
        if g_modsListApi is None or not self.added or available == self.available:
            return
        g_modsListApi.updateModification(id=MODS_LIST_ID, enabled=available)
        self.available = available

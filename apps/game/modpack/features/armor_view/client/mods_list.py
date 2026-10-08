from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.log import safe
from .constants import MODS_LIST_ICON, MODS_LIST_ID

try:
    from gui.modsListApi import g_modsListApi
except ImportError:
    g_modsListApi = None


# ModsList 1.6.01 keeps its entries by id, so the entry is added once and later only updated.
class ArmorEntry(object):

    def __init__(self, on_open):
        self.on_open = on_open
        self.shown = None

    @safe
    def show(self, name, description, enabled):
        shown = (name, description, enabled)
        if g_modsListApi is None or shown == self.shown:
            return

        if self.shown is None:
            g_modsListApi.addModification(
                id=MODS_LIST_ID, name=name, description=description, icon=MODS_LIST_ICON, enabled=enabled,
                login=False, lobby=True, callback=self.on_open,
            )
        else:
            g_modsListApi.updateModification(id=MODS_LIST_ID, name=name, description=description, enabled=enabled)

        self.shown = shown

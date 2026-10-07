"""Which GUI space the client is in: a label created in the hangar belongs to the hangar, one created in
battle to the battle."""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....hud.surface import SPACE_BATTLE, SPACE_LOBBY
from ...game import client_attr, service


def current_space():
    return SPACE_BATTLE if hasattr(BigWorld.player(), 'arena') else SPACE_LOBBY


def cursor_events():
    try:
        from gui.shared import EVENT_BUS_SCOPE, events, g_eventBus
    except ImportError:
        return None
    game_event = getattr(events, 'GameEvent', None)
    show = getattr(game_event, 'SHOW_CURSOR', None)
    hide = getattr(game_event, 'HIDE_CURSOR', None)
    if show is None or hide is None:
        return None
    return g_eventBus, EVENT_BUS_SCOPE.GLOBAL, show, hide


# RU 1.45 client source: CursorManager.show/hide set `GUI.mcursor().visible`.
def cursor_visible():
    try:
        import GUI
        return bool(GUI.mcursor().visible)
    except Exception:
        return None


def gui_spaces():
    space_ids = client_attr('skeletons.gui.app_loader', 'GuiGlobalSpaceID')
    if space_ids is None:
        return None, None
    return service(client_attr('skeletons.gui.app_loader', 'IAppLoader')), space_ids

"""Which GUI space the client is in: a label created in the hangar belongs to the hangar, one created in
battle to the battle."""
from __future__ import absolute_import, division, print_function, unicode_literals

import BigWorld

from ....hud.surface import SPACE_BATTLE, SPACE_LOBBY


def current_space():
    # The avatar has an arena, the account does not.
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


# Whether the client shows the mouse cursor (RU 1.45 client source: CursorManager.show/hide set `GUI.mcursor().visible`
# and fire SHOW_CURSOR/HIDE_CURSOR; Ctrl in battle, Tab, the chat), or None when it cannot be read.
def cursor_visible():
    try:
        import GUI
        return bool(GUI.mcursor().visible)
    except Exception:
        return None

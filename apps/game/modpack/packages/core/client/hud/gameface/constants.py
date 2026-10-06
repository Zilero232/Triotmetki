from __future__ import absolute_import, division, print_function, unicode_literals

# gui.impl.gen_utils.INVALID_RES_ID (RU 1.45 client source); openwg_gameface.res_id_by_key returns it for an
# unknown or not yet validated key.
INVALID_RES_ID = -1

# The wulf layer of the HUD window (WindowLayer.WINDOW, 7). RU 1.45
# client source, frameworks/wulf/gui_constants.py: VIEW 4 < SUB_VIEW 5 < TOP_SUB_VIEW 6 < WINDOW 7 < FULLSCREEN_WINDOW 8
# < TOP_WINDOW 10 < OVERLAY 11 < TOOLTIP 14. The Scaleform battle page is one SFWindow on VIEW, and the full stats
# (Tab), the battle loading screen and the post-battle end warning are components of that page
# (battle/classic/__init__.py), so no layer is under them yet over the page's own panels: below VIEW the window would
# sit under the whole page (the battle app has no MARKER container, gui/Scaleform/battle_entry.py) and lose the mouse
# there. The Esc menu (INGAME_MENU, TOP_WINDOW) and the tooltips are above WINDOW. The page fades the panels under the
# full stats and under a modal view instead (core.hud.layer COVER_EFFECTS). UNVERIFIED on Lesta 1.45: that the engine
# interleaves a Gameface window with the Scaleform layers at all (if not, it draws over every Scaleform view and the
# fade is all there is).
WINDOW_LAYER = 'WINDOW'

# skeletons.gui.app_loader.GuiGlobalSpaceID names (RU 1.45 client source) the HUD window may live in. A window
# opened before them (the login screen, while the lobby app is still being created) was never seen in the
# hangar in the 1.45.0.0 live test; the one opened after the battle space was entered drew.
READY_SPACES = ('LOBBY', 'BATTLE')

# openwg_gameface.RESTART_FLAG_FILE (1.2.2, Lesta): the file in the client's working folder that marks the restart it
# triggered after writing a new res_map.json.
RESTART_FLAG_FILE = 'res_map_restart'


# While the battle cursor is shown its visibility is also polled: the client hides it without a HIDE_CURSOR event the
# backend hears when another view holds the cursor, and a hidden cursor sits at the screen centre (CursorManager
# resetMousePosition, RU 1.45 client source), where the page would keep the crosshair panel's tooltip open.
CURSOR_POLL_S = 0.25

# After the client gave the focus back to the HUD window several times in a row, the backend tries again this much
# later instead of keeping it.
FOCUS_RETRY_S = 1.0

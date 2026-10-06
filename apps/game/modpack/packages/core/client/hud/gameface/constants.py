from __future__ import absolute_import, division, print_function, unicode_literals

# openwg_gameface.RESTART_FLAG_FILE (1.2.2, Lesta): the file in the client's working folder that marks the restart it
# triggered after writing a new res_map.json.
RESTART_FLAG_FILE = 'res_map_restart'

# While the battle cursor is shown its visibility is also polled: the client hides it without a HIDE_CURSOR event the
# backend hears when another view holds the cursor, and a hidden cursor sits at the screen centre (CursorManager
# resetMousePosition, RU 1.45 client source), where the page would keep the crosshair panel's tooltip open and the
# battle page's HUD page would keep the mouse.
CURSOR_POLL_S = 0.25

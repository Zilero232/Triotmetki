from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source (AS3, gui_base): net/wg/gui/components/containers/inject/GFInjectComponent.as, the stock
# Scaleform container the client draws a Gameface ViewImpl into (InjectComponent + wulf ChildViewProxy, the crew panel
# in the hangar, the context hints in battle). gui_base is loaded by the lobby and the battle app alike, so the class
# is found by its qualified name through the app's own ClassFactory (base_app ClassFactory.getObject).
GF_INJECT_CLASS = 'net.wg.gui.components.containers.inject.GFInjectComponent'

# The view model of our Gameface pages (the settings window, hud.html, viewer.html): one JSON string property, one
# command the page sends its messages through as {message}.
PAGE_STATE_PROPERTY = 'state'
PAGE_SEND_COMMAND = 'send'
PAGE_MESSAGE_ARG = 'message'

# gui.impl.gen_utils.INVALID_RES_ID (RU 1.45 client source): openwg_gameface.res_id_by_key for an unknown or not yet
# validated res_map key.
INVALID_RES_ID = -1

# gui/app_loader/settings.py APP_NAME_SPACE names (RU 1.45 client source) of the Scaleform apps a page goes into.
LOBBY_APP = 'SF_LOBBY'
# The HUD page in the Scaleform hangar view (docs/specs/2026-10-06-gameface-inject-host.md): the alias its
# GFInjectComponent is registered under. Nothing is placed in the battle page: the battle page inject of 0.3.7 crashed
# the client natively within minutes of a battle, so the battle draws from the HUD window.
HUD_INJECT_ALIAS = 'otmetkiHudInject'
# A placed page that has not loaded this long after is taken out again until its view loads the next time. The 1.45
# spike's page loaded within a frame in the hangar.
HUD_INJECT_LOAD_TIMEOUT_S = 10.0

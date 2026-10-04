from __future__ import absolute_import, division, print_function, unicode_literals

# One rule for everything that covers the battle view: the panels keep their place and stay drawn, only their `visible`
# (hidden) or `cover` (faded, taking no mouse and no tooltip) prop changes, so nothing is recreated and no docked column
# closes up. Reasons: the stock GUI hidden with V, the post-mortem camera on the killer, the battle loading screen with
# the team lists, the full stats held open with Tab, and a modal stock view (the Esc menu, the F1 help, the settings).
#
# The HUD window cannot go under them (core/client/hud/gameface: the full stats and the loading screen are components
# of the Scaleform battle page itself), so the page fades every panel instead (the full stats darken the whole screen):
# `stats` under Tab, `modal` under the Esc menu; the strongest reason names the fade.
COVER_GUI = 'gui'
COVER_KILLCAM = 'killcam'
COVER_LOADING = 'loading'
COVER_FULL_STATS = 'full_stats'
COVER_MENU = 'menu'
COVER_HIDE = 'hide'
COVER_STATS = 'stats'
COVER_MODAL = 'modal'
COVER_NONE = ''
COVER_EFFECTS = {
    COVER_GUI: COVER_HIDE,
    COVER_KILLCAM: COVER_HIDE,
    COVER_LOADING: COVER_HIDE,
    COVER_FULL_STATS: COVER_STATS,
    COVER_MENU: COVER_MODAL,
}
# The page's `cover` prop when several fading reasons are on: the strongest first.
COVER_FADES = (COVER_MODAL, COVER_STATS)

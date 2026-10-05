from __future__ import absolute_import, division, print_function, unicode_literals

# One rule for everything that covers the battle view: the panels keep their place and stay drawn, only their `visible`
# (hidden) or `cover` (faded, taking no mouse and no tooltip) prop changes, so nothing is recreated and no docked column
# closes up. Reasons: the stock GUI hidden with V, the post-mortem camera on the killer, the battle loading screen with
# the team lists, the battle page hiding its own HUD under an overlay (the full stats on any tab: Tab, the personal
# missions and personal reserves keys; the event stats), and a stock screen that replaces the battle
# view (a respawn screen, the Frontline overview map, a full-screen Gameface window). All of them hide the panels, as
# the stock page and Battle Observer and XVM hide theirs. `core.client.hud.cover` feeds them
# (docs/research/client/2026-10-05-battle-overlays.md). `menu` (the `modal` fade) is kept for a modal view over our
# window; nothing reports it while the Esc menu draws over the HUD window, as it does over the stock HUD.
COVER_GUI = 'gui'
COVER_KILLCAM = 'killcam'
COVER_LOADING = 'loading'
COVER_FULL_STATS = 'full_stats'
COVER_MENU = 'menu'
COVER_SCREEN = 'screen'
COVER_HIDE = 'hide'
COVER_STATS = 'stats'
COVER_MODAL = 'modal'
COVER_NONE = ''
COVER_EFFECTS = {
    COVER_GUI: COVER_HIDE,
    COVER_KILLCAM: COVER_HIDE,
    COVER_LOADING: COVER_HIDE,
    COVER_FULL_STATS: COVER_HIDE,
    COVER_MENU: COVER_MODAL,
    COVER_SCREEN: COVER_HIDE,
}
# The page's `cover` prop when several fading reasons are on: the strongest first.
COVER_FADES = (COVER_MODAL, COVER_STATS)
# The reasons that hide our panels while the stock HUD stays on screen: the stock elements a hidden panel replaces come
# back meanwhile, so the player never sees neither (the killer camera keeps the stock HUD).
COVER_RELEASES_STOCK = (COVER_KILLCAM,)

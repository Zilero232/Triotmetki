from __future__ import absolute_import, division, print_function, unicode_literals

# One rule for everything that covers the battle view: the panels keep their place and stay drawn, only their `visible`
# prop changes, so nothing is recreated and no docked column closes up. Reasons: the stock GUI hidden with V, the battle
# loading screen with the team lists, the battle page hiding its own HUD under an overlay (the full stats on any tab:
# Tab, the personal missions and personal reserves keys; the event stats), and a stock screen that replaces the battle
# view (a respawn screen, the Frontline overview map, a full-screen Gameface window). All of them hide the panels, as
# the stock page and Battle Observer and XVM hide theirs. `core.client.hud.cover` feeds them
# (docs/research/client/2026-10-05-battle-overlays.md). The Esc menu and dialogs are no reason: they draw over the HUD
# window as they do over the stock HUD. The post-mortem camera on the killer is no reason either: the stock HUD stays
# on it, and so do our panels (Battle Observer's page components and XVM's stay with the page), so the stock elements
# they replace stay hidden.
COVER_GUI = 'gui'
COVER_LOADING = 'loading'
COVER_FULL_STATS = 'full_stats'
COVER_SCREEN = 'screen'
COVER_REASONS = (COVER_GUI, COVER_LOADING, COVER_FULL_STATS, COVER_SCREEN)

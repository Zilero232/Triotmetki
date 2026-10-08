# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# contract/badges.schema.json, docs/specs/2026-10-06-modpack-user-badge.md: anonymous and unsigned, so an unbound
# install is marked too, as Near_You marks every install.
PRESENCE_PATH = '/mod/badges/presence'
# The battle start's lookup and one more for the players a vehicle added later brings.
MAX_LOOKUPS = 2
# contract/badges.schema.json accountIds maxItems, MOD_BADGES.maxAccountIds on the server (Frontline holds 60).
MAX_ACCOUNT_IDS = 100

# The companion's config.json switches: the whole mod and «show my badge» (shown on this component's page); the own row
# is marked and reported visible only while both are on.
ENABLED_KEY = 'enabled'
SHOW_OWN_KEY = 'show_pack_badge'

# The AS3 library (as3/, built by bun run swf:build into flash/, shipped as res/gui/flash/<name>) adds these functions
# to the battle page's prototype, as Battle Observer adds as_BattleObserverCreate; Python calls them on its flashObject.
LIBRARY_SWF = 'otmetki_pack_badge.swf'
FLASH_MARK = 'as_otmetkiPackBadge'
FLASH_REPAINT = 'as_otmetkiPackBadgeRepaint'
FLASH_CLEAR = 'as_otmetkiPackBadgeClear'
# The AS3 functions answer one "<screen> rows N, marked M" part per screen (players panel, Tab, loading), joined so.
STATUS_SEPARATOR = ' | '

LIBRARY_ADD = 'add'
LIBRARY_REMOVE = 'remove'

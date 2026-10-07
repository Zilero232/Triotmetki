# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# contract/badges.schema.json, docs/specs/2026-10-06-modpack-user-badge.md.
BADGES_PATH = '/mod/badges'
# contract/badges.schema.json accountIds maxItems, MOD_BADGES.maxAccountIds on the server (Frontline holds 60).
MAX_ACCOUNT_IDS = 100

# The companion's own switches (config.json): the whole mod and «show my badge» on the «Данные и сайт» page; the own row
# is marked only while both are on.
ENABLED_KEY = 'enabled'
SHOW_OWN_KEY = 'show_pack_badge'

# The AS3 library (as3/, built by bun run swf:build into flash/, shipped as res/gui/flash/<name>) adds these functions
# to the battle page's prototype, as Battle Observer adds as_BattleObserverCreate; Python calls them on its flashObject.
LIBRARY_SWF = 'otmetki_pack_badge.swf'
FLASH_MARK = 'as_otmetkiPackBadge'
FLASH_CLEAR = 'as_otmetkiPackBadgeClear'

LIBRARY_ADD = 'add'
LIBRARY_REMOVE = 'remove'

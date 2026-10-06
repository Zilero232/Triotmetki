# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# contract/badges.schema.json, docs/specs/2026-10-06-modpack-user-badge.md.
BADGES_PATH = '/mod/badges'
# contract/badges.schema.json accountIds maxItems, MOD_BADGES.maxAccountIds on the server (Frontline holds 60).
MAX_ACCOUNT_IDS = 100

# The stock prefix badge slot of the player panels, the Tab table and the loading screen (RU 1.45 client source:
# stats_exchange/vehicle.py VehicleInfoComponent.addVehicleInfo builds these keys; BadgeComponent.as draws `icon` from
# the battle atlas only when isAtlasSource is true, else loads it as an image). UNVERIFIED on Lesta 1.45: the image path
# form ImageManager resolves (the client's own RES_ICONS paths are '../maps/icons/...').
ACCOUNT_KEY = 'accountDBID'
HAS_BADGE_KEY = 'hasSelectedBadge'
BADGE_KEY = 'badge'
BADGE_ICON = '../maps/icons/otmetki/pack_badge/badge_24.png'
BADGE_SIZE = '24x24'

# The companion's own switches (config.json): the whole mod and «show my badge» on the «Данные и сайт» page; the own row
# is marked only while both are on.
ENABLED_KEY = 'enabled'
SHOW_OWN_KEY = 'show_pack_badge'

STOCK_REPLACE = 'replace'
STOCK_KEEP = 'keep'
STOCK_BADGE_CHOICES = (STOCK_REPLACE, STOCK_KEEP)

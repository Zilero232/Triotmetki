# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# contract/badges.schema.json, docs/specs/2026-10-06-modpack-user-badge.md.
BADGES_PATH = '/mod/badges'
# contract/badges.schema.json accountIds maxItems, MOD_BADGES.maxAccountIds on the server (Frontline holds 60).
MAX_ACCOUNT_IDS = 100

# The mark goes after the name, beside the stock name parts, and leaves the player's own prefix badge alone (RU 1.45
# client source: stats_exchange/vehicle.py VehicleInfoComponent.addVehicleInfo sends `region`; the players panel, the
# Tab table and the loading screen all draw the name through CommonsBattle.formatPlayerName as htmlText
# `name[clan] region igr`, the IGR mark being an <IMG SRC="img://gui/maps/icons/..."> there; Battle Observer draws
# its own img://gui/maps/icons files in battle text the same way). The players panel shows it in its full-name mode
# only: its cut-name modes draw the bare name. UNVERIFIED on Lesta 1.45: that img:// reads a PNG from a mod package
# in the battle name fields.
ACCOUNT_KEY = 'accountDBID'
REGION_KEY = 'region'
BADGE_TAG = '<IMG SRC="img://gui/maps/icons/otmetki/pack_badge/badge_16.png" width="16" height="16" vspace="-4"/>'

# The companion's own switches (config.json): the whole mod and «show my badge» on the «Данные и сайт» page; the own row
# is marked only while both are on.
ENABLED_KEY = 'enabled'
SHOW_OWN_KEY = 'show_pack_badge'

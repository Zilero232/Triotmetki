# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: gui/Scaleform/required_libraries_config.py BATTLE_REQUIRED_LIBRARIES, the SWFs the battle app
# loads into its own application domain when it is created (battle_entry._getRequiredLibraries, AS3 LibrariesLoader);
# Battle Observer appends its modBattleObserver.swf the same way (armagomen/battle_observer/__init__.py). The file is
# model.constants LIBRARY_SWF of this package (as3/, bun run swf:build).
LIBRARIES_MODULE = 'gui.Scaleform.required_libraries_config'
LIBRARIES_NAME = 'BATTLE_REQUIRED_LIBRARIES'

# gui/app_loader/settings.py APP_NAME_SPACE and gui/Scaleform/daapi/settings/views.py VIEW_ALIAS of the battle pages
# with the players panel («уши»), RU 1.45 client source.
BATTLE_APP = 'SF_BATTLE'
PAGE_ALIASES = ('classicBattlePage', 'epicRandomPage', 'strongholdBattlePage', 'rankedBattlePage', 'comp7BattlePage')

# The library loads while the loading screen is up; the page is polled for its functions this long.
FLASH_RETRY_S = 0.5
FLASH_RETRIES = 60

# The arena adds the vehicles one by one at the start: their players are asked together, once the adds went quiet.
LOOKUP_BATCH_S = 1.0

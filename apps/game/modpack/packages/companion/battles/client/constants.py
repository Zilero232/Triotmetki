from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: the results of a battle the player left early reach the lobby only through the
# game's own request (gui/battle_results/service.py requestResults, on the lobby load or the notification
# click). That request stores them in the on-disk cache (client_common/shared_utils/account_helpers/
# BattleResultsCache.py save) and then fires IBattleResultsService.onResultPosted. The mod never calls
# BattleResultsCache.get: it sends CMD_REQ_BATTLE_RESULTS, and while it waits the game's own window gets
# RES_COOLDOWN ("results unavailable"). Reading the file back with BattleResultsCache.load sends nothing.
SERVICE_MODULE = 'skeletons.gui.battle_results'
SERVICE_NAME = 'IBattleResultsService'
POSTED_EVENT = 'onResultPosted'

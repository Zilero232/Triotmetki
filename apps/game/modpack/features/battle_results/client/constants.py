from __future__ import absolute_import, division, print_function, unicode_literals

# Fair play: only the own vehicle's shots (core.client.battle.on_own_shot).
KIND_RECEIVED = 'received'
KIND_BY_EVENT = (('RECEIVED_DAMAGE', KIND_RECEIVED),)
# RU 1.45 messenger/formatters/service_channel.py BattleResultsFormatter.format(message, callback).
FORMATTER_MODULE = 'messenger.formatters.service_channel'
FORMATTER_CLASS = 'BattleResultsFormatter'
FORMAT_METHOD = 'format'
ARENA_KEY = 'arenaUniqueID'
SAVED_KEY = 'savedData'
TEXT_KEY = 'message'
# RU 1.45 client source: battleNotifier, isBattleNotifierEnabled() and GAME.ENABLE_BATTLE_NOTIFIER.
NOTIFIER_CONTROLLER = 'battleNotifier'
LOBBY_CONTEXT_MODULE = 'skeletons.gui.lobby_context'
LOBBY_CONTEXT = 'ILobbyContext'
NOTIFIER_SERVER_FLAG = 'isBattleNotifierEnabled'
NOTIFIER_OPTION = 'enableBattleNotifier'

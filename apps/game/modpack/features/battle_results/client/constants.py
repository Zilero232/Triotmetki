from __future__ import absolute_import, division, print_function, unicode_literals

# The shots come from core.client.battle.on_own_shot (the player's own vehicle only). Drawing their points on the
# hangar's 3D model needs its collision boxes and could not be checked without the client, so the window shows a
# schematic instead.
# RU 1.45 common/BattleFeedbackCommon.BATTLE_EVENT_TYPE: the own feedback's received damage (the attacker is the
# target id).
KIND_RECEIVED = 'received'
KIND_BY_EVENT = (('RECEIVED_DAMAGE', KIND_RECEIVED),)
# RU 1.45 messenger/formatters/service_channel.py: BattleResultsFormatter.format(message, callback) builds the stock
# post-battle message from `message.data` (its `arenaUniqueID`) and calls back with MessageData items whose `data` is
# the template's dict (doc_loaders/html_templates.py): the text under `message`, the arena under `savedData`.
FORMATTER_MODULE = 'messenger.formatters.service_channel'
FORMATTER_CLASS = 'BattleResultsFormatter'
FORMAT_METHOD = 'format'
ARENA_KEY = 'arenaUniqueID'
SAVED_KEY = 'savedData'
TEXT_KEY = 'message'
# RU 1.45 client source: the reads behind the stock battle notifier (model/battle/constants NOTIFIER_READS): the
# session's DynamicControllersLocator.battleNotifier (None on a battle type without it),
# ILobbyContext.getServerSettings().isBattleNotifierEnabled() and the settings core's GAME.ENABLE_BATTLE_NOTIFIER.
NOTIFIER_CONTROLLER = 'battleNotifier'
LOBBY_CONTEXT_MODULE = 'skeletons.gui.lobby_context'
LOBBY_CONTEXT = 'ILobbyContext'
NOTIFIER_SERVER_FLAG = 'isBattleNotifierEnabled'
NOTIFIER_OPTION = 'enableBattleNotifier'

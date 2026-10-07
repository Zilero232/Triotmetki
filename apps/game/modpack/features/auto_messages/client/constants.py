# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 messenger/MessengerEntry.g_instance.gui.channelsCtrl: one controller per battle channel.
MESSENGER_MODULE = 'messenger.MessengerEntry'
MESSENGER_INSTANCE = 'g_instance'
CHANNELS_MODULE = 'messenger.m_constants'
CHANNELS_CLASS = 'BATTLE_CHANNEL'
CHANNEL_SETTINGS = (('team', 'TEAM'), ('squad', 'SQUAD'))
# RU 1.45 g_messengerEvents.onErrorReceived carries shared_errors.ChatBanError for a chat-banned player.
EVENTS_MODULE = 'messenger.proto.events'
EVENTS_INSTANCE = 'g_messengerEvents'
ERRORS_MODULE = 'messenger.proto.shared_errors'
BAN_ERROR_CLASS = 'ChatBanError'

# RU 1.45 common/BattleFeedbackCommon.BATTLE_EVENT_TYPE names; received kinds name the attacker.
RECEIVED = 'received'
KILL = 'kill'
EVENT_KINDS = (('RECEIVED_DAMAGE', RECEIVED), ('KILL', KILL))
# RU 1.45 gui.battle_control.battle_constants.VEHICLE_VIEW_STATE names.
OBSERVED = 'observed'
FIRE_STATE = 'fire'
DEVICES = 'devices'
HEALTH = 'health'
VEHICLE_STATES = (('OBSERVED_BY_ENEMY', OBSERVED), ('FIRE', FIRE_STATE), ('DEVICES', DEVICES), ('HEALTH', HEALTH))
# RU 1.45 common/chat_commands_consts.BATTLE_CHAT_COMMAND_NAMES, sent as the radial menu sends them.
HELP_COMMAND = 'HELPME'
ATTENTION_COMMAND = 'ATTENTION_TO_POSITION'
EXTRA_HELP = 'help'
EXTRA_ATTENTION = 'attention'

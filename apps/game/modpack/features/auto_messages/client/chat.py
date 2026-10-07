from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import shared
from ....core.client.game import client_attr
from ....core.log import guarded
from .constants import (
    ATTENTION_COMMAND,
    BAN_ERROR_CLASS,
    CHANNEL_SETTINGS,
    CHANNELS_CLASS,
    CHANNELS_MODULE,
    ERRORS_MODULE,
    EVENTS_INSTANCE,
    EVENTS_MODULE,
    EXTRA_ATTENTION,
    EXTRA_HELP,
    HELP_COMMAND,
    MESSENGER_INSTANCE,
    MESSENGER_MODULE,
)


def messenger_events():
    return client_attr(EVENTS_MODULE, EVENTS_INSTANCE)


def is_chat_ban(error):
    ban = client_attr(ERRORS_MODULE, BAN_ERROR_CLASS)
    return ban is not None and isinstance(error, ban)


def _wanted_settings(channel):
    holder = client_attr(CHANNELS_MODULE, CHANNELS_CLASS)
    name = dict(CHANNEL_SETTINGS).get(channel)
    return getattr(holder, name, None) if name else None


@guarded('auto messages: battle channel')
def battle_channel(channel):
    wanted = _wanted_settings(channel)
    entry = client_attr(MESSENGER_MODULE, MESSENGER_INSTANCE)
    controllers = getattr(getattr(entry, 'gui', None), 'channelsCtrl', None)
    if wanted is None or controllers is None:
        return None
    for controller in controllers.getControllersIterator():
        if controller.getSettings() == wanted:
            return controller
    return None


# The chat input's own path (RU 1.45 BattleLayout.sendMessage): canSendMessage() is the channel's own gate (the
# player's battle chat setting, teammates, Battle Royale, the 0.5 s broadcast cooldown); asked first, so a refused line
# is dropped without the stock error line.
@guarded('auto messages: send', False)
def send_line(channel, text):
    controller = battle_channel(channel)
    if controller is None:
        return False
    allowed = controller.canSendMessage()[0]
    if not allowed:
        return False
    return bool(controller.sendMessage(text))


@guarded('auto messages: quick command')
def send_extra(extra, own_position):
    commands = shared('chatCommands')
    if commands is None:
        return
    if extra == EXTRA_HELP:
        commands.sendCommand(HELP_COMMAND)
    elif extra == EXTRA_ATTENTION and own_position is not None:
        commands.sendAttentionToPosition3D(own_position, ATTENTION_COMMAND)

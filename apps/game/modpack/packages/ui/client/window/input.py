from __future__ import absolute_import, division, print_function, unicode_literals


from ....core.client.game import lobby_app


def game_input_manager():
    return getattr(lobby_app(), 'gameInputManager', None)

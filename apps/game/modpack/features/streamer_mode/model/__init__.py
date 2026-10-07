from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import PRIVATE_HANGAR_LABELS

# Fair play: this component only hides things (the mod's own panels, the battle chat of others); it reads nothing.


def blocked_labels(settings):
    if settings.get('private') and settings.get('hide_hangar_stats'):
        return PRIVATE_HANGAR_LABELS
    return ()


def hides_chat(settings, in_battle):
    return bool(in_battle and settings.get('private') and settings.get('hide_chat'))


def is_player_line(session_id, is_own_line):
    return bool(session_id) and not is_own_line


class PanelToggle(object):

    def __init__(self):
        self.hidden = False

    def toggle(self):
        self.hidden = not self.hidden
        return self.hidden

    def battle_started(self, keep_hidden):
        if not keep_hidden:
            self.hidden = False
        return self.hidden

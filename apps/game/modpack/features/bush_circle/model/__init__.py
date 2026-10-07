from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import COLORS, MODE_ALWAYS, MODE_HOTKEY, RADIUS_M

# Fair play: a fixed circle around the own tank only; nothing about other vehicles.


def color_of(name):
    return COLORS.get(name, COLORS['white'])


def diameter():
    return RADIUS_M * 2


class CircleState(object):

    def __init__(self, mode):
        self.mode = mode
        self.toggled = False
        self.alive = True

    def toggle(self):
        if self.mode != MODE_HOTKEY:
            return False
        self.toggled = not self.toggled
        return True

    def killed(self):
        changed = self.alive
        self.alive = False
        return changed

    def respawned(self):
        changed = not self.alive
        self.alive = True
        return changed

    def wanted(self):
        return self.alive and (self.mode == MODE_ALWAYS or self.toggled)

from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import PLACE_HANGAR, PLACE_REPLAY, PLACE_SWITCHES, START, STOP  # noqa: F401

# Fair play: the client's own video camera (AvatarInputHandler.VideoCamera), flown only over a replay being watched and
# over the hangar. A live battle never gets it: there a free camera would show what the tank cannot see.


def flight_place(in_battle, is_replay):
    if not in_battle:
        return PLACE_HANGAR
    return PLACE_REPLAY if is_replay else None


def allowed(place, values):
    switch = PLACE_SWITCHES.get(place)
    return bool(switch and values.get(switch))


class Flight(object):
    def __init__(self):
        self.place = None
        self.hid_ui = False

    @property
    def active(self):
        return self.place is not None

    def press(self, place, values):
        if self.active:
            return STOP
        return START if allowed(place, values) else None

    def started(self, place, hid_ui):
        self.place = place
        self.hid_ui = hid_ui

    def stopped(self):
        place, hid_ui = self.place, self.hid_ui
        self.place = None
        self.hid_ui = False
        return place, hid_ui

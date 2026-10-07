from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from .constants import PERCENT, SCALES, STOCK

# Fair play: visual only; dispersion, the aim sent to the server and the replay's size stay the client's.


def circle_percent(choice):
    return SCALES.get(choice, SCALES[STOCK])


def is_scaled(choice):
    return circle_percent(choice) != SCALES[STOCK]


def scaled_size(size, percent):
    if not is_number(size):
        return size
    return size * percent / PERCENT

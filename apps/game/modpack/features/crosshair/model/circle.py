from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from .constants import AIM_CIRCLE_SCALES, PERCENT

# Fair play: visual only; dispersion, the aim sent to the server and the replay's size stay the client's.


def circle_percent(choice):
    return AIM_CIRCLE_SCALES.get(choice, AIM_CIRCLE_SCALES['stock'])


def is_scaled(choice):
    return circle_percent(choice) != AIM_CIRCLE_SCALES['stock']


def scaled_size(size, percent):
    if not is_number(size):
        return size
    return size * percent / PERCENT

from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from .constants import AIM_CIRCLE_SCALES, PERCENT

# Visual only: the gun marker the client already draws, at a share of the size it computed. The dispersion, the aim
# sent to the server, the shot and the replay's recorded size stay the client's.


def circle_percent(choice):
    return AIM_CIRCLE_SCALES.get(choice, AIM_CIRCLE_SCALES['stock'])


def is_scaled(choice):
    return circle_percent(choice) != AIM_CIRCLE_SCALES['stock']


def scaled_size(size, percent):
    if not is_number(size) or isinstance(size, bool):
        return size
    return size * percent / PERCENT

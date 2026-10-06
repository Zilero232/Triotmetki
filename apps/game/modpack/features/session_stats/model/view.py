from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.vendor import attr


@attr.s(frozen=True)
class SessionView(object):

    summary = attr.ib()
    goals = attr.ib(default=())
    overview = attr.ib(default=None)
    vehicle_names = attr.ib(factory=dict)
    moe = attr.ib(default=())

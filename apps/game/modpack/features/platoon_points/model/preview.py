from __future__ import absolute_import, division, print_function, unicode_literals

from . import Platoon
from .constants import KIND_ASSIST, KIND_DAMAGE, PREVIEW_MEMBERS, PREVIEW_OWN
from .text import points_text
from .widget import points_widget


def _named(seen, translate):
    named = dict(seen)
    named['name'] = translate(seen['name'])
    return named


def preview_platoon(translate):
    platoon = Platoon()
    for vehicle_id, seen, hp, frags in PREVIEW_MEMBERS:
        platoon.add(vehicle_id, _named(seen, translate))
        platoon.set_health(vehicle_id, hp)
        platoon.members[vehicle_id]['frags'] = frags
    platoon.add_own(KIND_DAMAGE, PREVIEW_OWN[KIND_DAMAGE])
    platoon.add_own(KIND_ASSIST, PREVIEW_OWN[KIND_ASSIST])
    return platoon


def preview_text(settings, translate):
    return points_text(preview_platoon(translate), settings, translate)


def preview_widget(settings, translate):
    return points_widget(preview_platoon(translate), settings, translate)

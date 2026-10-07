from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.icons import class_icon
from ....core.hud.widget import color_override, widget
from ..settings.constants import FIXED
from .constants import KIND, SIDE_COLOR_KEYS, SIDE_TINTS, SIDE_TONES, STRIP_STYLES
from .strip import strip_rows

# Fair play: what the stock strip, panels and markers show; an unseen enemy keeps its last known HP.


def side(health, totals, frags):
    return {
        'hp': health['hp'],
        'max': health['max'],
        'alive': totals['alive'],
        'count': totals['count'],
        'frags': frags,
    }


def vehicle_row(vehicle, tier, tint, options):
    icon = class_icon(vehicle.get('kind'), tint) if options['icons'] else None
    return {
        'icon': icon,
        'tier': tier,
        'hp': vehicle['hp'],
        'max': vehicle['max'],
        'alive': vehicle['alive'],
    }


def strip_vehicles(teams, allies, options):
    tint = SIDE_TINTS[allies]
    return [vehicle_row(vehicle, tier, tint, options) for vehicle, tier in strip_rows(teams, allies, options)]


def strip_sides(teams, settings, options):
    if settings.get('style') not in STRIP_STYLES:
        return {'allies': [], 'enemies': []}

    return {
        'allies': strip_vehicles(teams, True, options),
        'enemies': strip_vehicles(teams, False, options),
    }


def team_hp_widget(teams, settings, options):
    values = teams.values()

    return widget(KIND, {
        'style': settings.get('style'),
        'allies': side(teams.health(True), teams.totals(True), values['allies_frags']),
        'enemies': side(teams.health(False), teams.totals(False), values['enemies_frags']),
        'show_score': bool(settings.get('show_score')),
        'score_alive': bool(settings.get('show_alive')),
        'diff': values['diff'] if settings.get('show_diff') else None,
        'tones': dict(SIDE_TONES),
        'colors': {side: color_override(settings.get(key), FIXED[key]) for side, key in SIDE_COLOR_KEYS},
        'vehicles': strip_sides(teams, settings, options),
    })

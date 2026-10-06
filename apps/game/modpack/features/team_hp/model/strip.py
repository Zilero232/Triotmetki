from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import ENABLE_TIER_GROUPING, SHOW_VEHICLES_COUNTER, TIER_NUMERALS


# RU 1.45 frag_correlation_bar.py __initializeSettings: the vehicle icons follow showVehiclesCounter and the tier
# grouping needs them on too; an option the settings core does not answer keeps its default (on).
def strip_options(client_settings):
    values = client_settings or {}
    icons = bool(values.get(SHOW_VEHICLES_COUNTER, True))
    tiers = icons and bool(values.get(ENABLE_TIER_GROUPING, True))
    return {'icons': icons, 'tiers': tiers}


def tier_numeral(level):
    if level is None or not 1 <= level <= len(TIER_NUMERALS):
        return None
    return TIER_NUMERALS[level - 1]


def tier_levels(vehicles):
    return set(vehicle['level'] for vehicle in vehicles if vehicle['level'] is not None)


# gui_battle VehicleMarkersList.sort: both sides show their tier labels once either side has more than one tier
# (FragCorrelationBar.setVehiclesData forces the grouping on both lists).
def shows_tier_labels(teams):
    return any(len(tier_levels(teams.team(allies))) > 1 for allies in (True, False))


def tier_order(vehicles):
    # VehicleMarkersList.compareWithTierGroup: the higher tier first, the arena order within a tier (sorted is stable).
    return sorted(vehicles, key=lambda vehicle: -(vehicle['level'] or 0))


def strip_rows(teams, allies, options):
    vehicles = teams.team(allies)
    if not options['tiers']:
        return [(vehicle, None) for vehicle in vehicles]

    labelled = shows_tier_labels(teams)
    rows = []
    previous_level = None
    for vehicle in tier_order(vehicles):
        starts_group = labelled and vehicle['level'] != previous_level
        label = tier_numeral(vehicle['level']) if starts_group else None
        rows.append((vehicle, label))
        previous_level = vehicle['level']
    return rows

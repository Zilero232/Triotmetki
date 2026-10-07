from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hit_book import DAMAGING
from .constants import OWN_TARGET, PROFILE_MIN_HITS, SIDE_RECEIVED, WEAK_MIN_PENS, ZONES
from .zones import zone_of

# Fair play: only the hits on the own tank from the player's own kept battles, read in the hangar.


def own_cd(battle):
    own = (battle or {}).get('targets', {}).get(OWN_TARGET)
    return own['cd'] if own else None


def profile_key(battles, cd):
    return cd, tuple((battle['id'], len(battle['hits'])) for battle in battles)


def _own_hits(battle):
    return [hit for hit in battle['hits'] if hit['side'] == SIDE_RECEIVED and hit['target'] == OWN_TARGET]


def _weak_zone(zones, hits):
    if hits < PROFILE_MIN_HITS:
        return None
    found = [zone for zone in zones if zone['pens'] >= WEAK_MIN_PENS]
    if not found:
        return None
    return max(found, key=lambda zone: (zone['pens'], zone['pens'] / zone['hits']))['id']


def armor_profile(battles, cd):
    counts = {zone: {'id': zone, 'hits': 0, 'pens': 0} for zone in ZONES}
    used = total = held = 0
    for battle in battles:
        hits = _own_hits(battle) if own_cd(battle) == cd else []
        used += 1 if hits else 0
        for hit in hits:
            zone = zone_of(hit['segments'])
            if zone is None:
                continue
            total += 1
            counts[zone]['hits'] += 1
            if hit['outcome'] in DAMAGING:
                counts[zone]['pens'] += 1
            else:
                held += 1
    zones = [counts[zone] for zone in ZONES if counts[zone]['hits']]
    return {'battles': used, 'hits': total, 'held': held, 'zones': zones, 'weak': _weak_zone(zones, total)}

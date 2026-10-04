from __future__ import absolute_import, division, print_function, unicode_literals

import os

from ....core.compat import is_int, to_text
from ....core.vendor import attr
from .constants import (
    BATTLE_TYPES,
    MAP_NAME,
    MAP_SMALL_ICON,
    MAP_STATS_ICON,
    MASTERY_ICON,
    MAX_MASTERY,
    OTHER_BATTLE_TYPE,
    PAGE_KIND,
    RESULTS,
    SITE_ANALYSED,
    SITE_QUEUED,
    SITE_REPLAY_PATH,
    SITE_UPLOADED,
    STAT_KEYS,
    STATUS_INDEXING,
    STATUS_NO_ACCOUNT,
    STATUS_READY,
    VEHICLE_ICON,
    VEHICLE_NAME,
)
from .version import compatible


def _int_or_none(value):
    return value if is_int(value) else None


# (nation, name) of the header's `playerVehicle` (`ussr-R04_T-34`), or (None, None).
def vehicle_parts(vehicle):
    if not vehicle or not VEHICLE_NAME.match(vehicle):
        return None, None
    nation, name = vehicle.split('-', 1)
    return nation, name


def _is_vehicle_code(prefix):
    return prefix[:1].isalpha() and any(char.isdigit() for char in prefix)


# A readable name from the vehicle's code name when the client has no localized one (`R04_T-34` -> `T-34`).
def vehicle_label(vehicle):
    name = vehicle_parts(vehicle)[1] or vehicle
    if not name:
        return None
    parts = name.split('_', 1)
    if len(parts) < 2 or not _is_vehicle_code(parts[0]):
        return name
    return parts[1].replace('_', ' ')


def battle_type(header):
    kind = header.get('battle_type')
    if not is_int(kind):
        return OTHER_BATTLE_TYPE
    return BATTLE_TYPES.get(kind, OTHER_BATTLE_TYPE)


def map_icons(map_name):
    if not map_name or not MAP_NAME.match(map_name):
        return None, None
    return MAP_STATS_ICON % map_name, MAP_SMALL_ICON % map_name


def mastery_icon(mastery):
    if not is_int(mastery) or not 1 <= mastery <= MAX_MASTERY:
        return None
    return MASTERY_ICON % mastery


def site_state(header, index, queued, analysed):
    arena = header.get('arena_unique_id')
    replay_id = index.get(arena) if arena and index is not None else None
    if replay_id:
        state = SITE_ANALYSED if replay_id in analysed else SITE_UPLOADED
        return {'state': state, 'link': SITE_REPLAY_PATH % replay_id}
    if arena and arena in queued:
        return {'state': SITE_QUEUED, 'link': None}
    return None


def _no_vehicle(tank_id, vehicle):
    return {}


def _no_image(path):
    return None


# What a page needs beside the replays: the account's index, the client, and the client lookups the glue passes in
# (`describe_vehicle(tank_id, vehicle)` -> {label, tier, cls}, `image(path)` -> an image string or None).
@attr.s(eq=False)
class PageContext(object):

    index = attr.ib(default=None)
    client_version = attr.ib(default=None)
    queued = attr.ib(default=())
    analysed = attr.ib(default=())
    upload = attr.ib(default=None)
    describe_vehicle = attr.ib(default=None, converter=lambda value: value or _no_vehicle)
    image = attr.ib(default=None, converter=lambda value: value or _no_image)
    viewer_battles = attr.ib(default=(), converter=frozenset)

    def image_of(self, path):
        return self.image(path) if path else None


# (favourite, site state) of a replay: what an item shows beside its file and header.
def marks_of(replay, context):
    header = replay.get('header') or {}
    index = context.index
    favourite_key = header.get('arena_unique_id') or replay['name']
    is_favourite = bool(index is not None and index.is_favourite(favourite_key))
    return is_favourite, site_state(header, index, context.queued, context.analysed)


def _map_fields(header, context):
    map_name = header.get('map_name')
    big_map, small_map = map_icons(map_name)
    return {
        'map': map_name,
        'map_title': header.get('map_title') or map_name,
        'map_image': context.image_of(big_map),
        'map_thumb': context.image_of(small_map),
    }


def _vehicle_fields(vehicle, stats, context):
    nation = vehicle_parts(vehicle)[0]
    described = context.describe_vehicle(stats.get('tank_id'), vehicle) or {}
    icon = VEHICLE_ICON % vehicle if nation else None
    return {
        'vehicle': vehicle,
        'tank': described.get('label') or vehicle_label(vehicle),
        'tier': described.get('tier'),
        'cls': described.get('cls'),
        'nation': nation,
        'tank_image': context.image_of(icon),
    }


def _result_fields(header, stats, context):
    result = header.get('result')
    mastery = stats.get('mastery')
    fields = {
        'result': result if result in RESULTS else None,
        'damage': header.get('damage'),
        'survived': stats.get('survived'),
        'mastery': _int_or_none(mastery),
        'mastery_image': context.image_of(mastery_icon(mastery)),
    }
    for key in STAT_KEYS:
        fields[key] = _int_or_none(stats.get(key))
    return fields


def item_of(replay, context, marks=None):
    header = replay.get('header') or {}
    stats = header.get('stats') or {}
    is_favourite, site = marks if marks is not None else marks_of(replay, context)

    item = {
        'id': replay['name'],
        'title': os.path.splitext(replay['name'])[0],
        'size': replay['size'],
        'time': int(header.get('date_time') or replay['mtime']),
        'arena': header.get('arena_unique_id'),
        'type': battle_type(header),
        'version': header.get('client_version'),
        'playable': compatible(header.get('client_version'), context.client_version),
        'favourite': is_favourite,
        'site': site,
    }
    item.update(_map_fields(header, context))
    item.update(_vehicle_fields(header.get('vehicle'), stats, context))
    item.update(_result_fields(header, stats, context))
    return item


def page_status(account_id, library):
    if account_id is None:
        return STATUS_NO_ACCOUNT
    return STATUS_INDEXING if library.indexing() else STATUS_READY


def _frozen(site):
    return (site['state'], site['link']) if site else None


# The items already described, by file name: an item is built again only when its file, its header, its marks or
# the client change, so a page of a thousand replays costs a lookup per replay.
class ItemCache(object):

    def __init__(self):
        self.items = {}

    def items_of(self, replays, context):
        known = self.items
        self.items = {}
        return [self._item(replay, context, known.get(replay['name'])) for replay in replays]

    def _item(self, replay, context, cached):
        marks = marks_of(replay, context)
        key = (replay['size'], replay['mtime'], marks[0], _frozen(marks[1]), context.client_version)
        header = replay.get('header')

        is_current = cached is not None and cached[0] is header and cached[1] == key
        item = cached[2] if is_current else item_of(replay, context, marks)

        self.items[replay['name']] = (header, key, item)
        return item


def _items(replays, context, cache):
    if cache is None:
        return [item_of(replay, context) for replay in replays]
    return cache.items_of(replays, context)


def build_page(replays, context, status, progress, folder, cache=None):
    done, total = progress
    items = _items(replays, context, cache)
    return {
        'kind': PAGE_KIND,
        'status': status,
        'progress': {'done': done, 'total': total},
        'client': to_text(context.client_version or ''),
        'folder': to_text(folder or ''),
        'upload': context.upload,
        'hit_viewer': sorted(to_text(battle_id) for battle_id in context.viewer_battles),
        'items': items,
    }

from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, to_text
from ....core.errors import ReasonError
from ....core.vendor import attr
from .constants import (
    ENABLED_KEY,
    LIBRARY_ADD,
    LIBRARY_REMOVE,
    MAX_ACCOUNT_IDS,
    MAX_LOOKUPS,
    SHOW_OWN_KEY,
    STATUS_SEPARATOR,
)

# Not combat information (docs/specs/2026-10-06-modpack-user-badge.md): the request carries only the own account id, the
# own "show my badge" switch and the account ids of the arena data behind the stock player panels, never vehicles,
# teams, HP or positions; an anonymised player's real id is not sent.


@attr.s(frozen=True)
class ArenaPlayer(object):

    account_id = attr.ib()
    name = attr.ib()
    fake_name = attr.ib()
    is_bot = attr.ib()


def is_anonymised(name, fake_name):
    return bool(fake_name) and fake_name != name


def asked_account_ids(players, own_account_id, limit=MAX_ACCOUNT_IDS):
    ids = []
    for player in players:
        account_id = player.account_id
        if not is_int(account_id) or account_id <= 0 or account_id == own_account_id or account_id in ids:
            continue
        if player.is_bot or is_anonymised(player.name, player.fake_name):
            continue
        ids.append(int(account_id))
    return ids[:limit]


def presence_request(own_account_id, visible, account_ids):
    if not is_int(own_account_id) or own_account_id <= 0:
        raise ReasonError('no_account')
    return {'account_id': int(own_account_id), 'visible': bool(visible), 'account_ids': list(account_ids)}


def parse_badges(data, asked):
    ids = data.get('account_ids') if isinstance(data, dict) else None
    if not isinstance(ids, list):
        return frozenset()
    return frozenset(account_id for account_id in ids if is_int(account_id) and account_id in asked)


def status_lines(status):
    if status is None:
        return []
    return [part.strip() for part in to_text(status).split(STATUS_SEPARATOR) if part.strip()]


def show_own(config):
    return bool(config.get(ENABLED_KEY)) and bool(config.get(SHOW_OWN_KEY))


def marked_vehicle_ids(vehicles, marked):
    ids = set()
    for vehicle_id, account_id in vehicles:
        if is_int(vehicle_id) and vehicle_id > 0 and account_id in marked:
            ids.add(int(vehicle_id))
    return sorted(ids)


# The stock rows keep the vehicle id in private fields Scaleform does not resolve from a mod, so the library finds a row
# by the name it shows: the player name, and the fake name the client shows for an anonymised player.
def marked_names(players, marked):
    names = set()
    for player in players:
        if player.account_id not in marked:
            continue
        for name in (player.name, player.fake_name):
            if name:
                names.add(to_text(name))
    return sorted(names)


def library_action(libraries, name, is_on):
    if is_on and name not in libraries:
        return LIBRARY_ADD
    if not is_on and name in libraries:
        return LIBRARY_REMOVE
    return None


class BattleBadges(object):

    def __init__(self):
        self.start(None, None, False)

    def start(self, arena_id, own_account_id, visible):
        self.arena_id = arena_id
        self.own_account_id = own_account_id
        self.visible = bool(visible)
        self.marked = frozenset([own_account_id]) if own_account_id and visible else frozenset()
        self.asked = frozenset()
        self.lookups = 0

    def lookup(self, account_ids):
        if not self.own_account_id or self.lookups >= MAX_LOOKUPS:
            return None
        fresh = [account_id for account_id in account_ids if account_id not in self.asked]
        if not fresh and (self.lookups or not self.visible):
            return None
        self.lookups += 1
        self.asked = self.asked | frozenset(fresh)
        return fresh

    def answered(self, arena_id, account_ids):
        if arena_id != self.arena_id or not account_ids:
            return False
        before = self.marked
        self.marked = before | frozenset(account_ids)
        return self.marked != before

    def stop(self):
        self.start(None, None, False)

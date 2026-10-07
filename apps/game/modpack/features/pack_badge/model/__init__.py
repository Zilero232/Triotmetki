from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int
from ....core.errors import ReasonError
from ....core.me import device_body
from ....core.vendor import attr
from .constants import ENABLED_KEY, LIBRARY_ADD, LIBRARY_REMOVE, MAX_ACCOUNT_IDS, SHOW_OWN_KEY

# Not combat information (docs/specs/2026-10-06-modpack-user-badge.md): the request carries only the account ids of the
# arena data behind the stock player panels, never vehicles, teams, HP or positions; an anonymised player's real id
# and the own account are not sent.


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


def badges_request(credentials, account_ids):
    if not account_ids:
        raise ReasonError('no_players')
    body = device_body(credentials)
    body['account_ids'] = list(account_ids)
    return body


def parse_badges(data, asked):
    ids = data.get('account_ids') if isinstance(data, dict) else None
    if not isinstance(ids, list):
        return frozenset()
    return frozenset(account_id for account_id in ids if is_int(account_id) and account_id in asked)


def show_own(config):
    return bool(config.get(ENABLED_KEY)) and bool(config.get(SHOW_OWN_KEY))


def marked_vehicle_ids(vehicles, marked):
    ids = set()
    for vehicle_id, account_id in vehicles:
        if is_int(vehicle_id) and vehicle_id > 0 and account_id in marked:
            ids.add(int(vehicle_id))
    return sorted(ids)


def library_action(libraries, name, is_on):
    if is_on and name not in libraries:
        return LIBRARY_ADD
    if not is_on and name in libraries:
        return LIBRARY_REMOVE
    return None


class BattleBadges(object):

    def __init__(self):
        self.arena_id = None
        self.marked = frozenset()
        self.requested = False

    def start(self, arena_id, own_account_id):
        self.arena_id = arena_id
        self.marked = frozenset([own_account_id]) if own_account_id else frozenset()
        self.requested = False

    def answered(self, arena_id, account_ids):
        if arena_id != self.arena_id or not account_ids:
            return False
        before = self.marked
        self.marked = before | frozenset(account_ids)
        return self.marked != before

    def stop(self):
        self.start(None, None)

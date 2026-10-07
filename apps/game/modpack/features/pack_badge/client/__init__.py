from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import BattleHooks, arena, arena_dp, own_account_id
from ....core.client.component import FeatureComponent
from ....core.client.me import post_signed
from ....core.errors import ReasonError
from ....core.log import log
from ....core.me import OK_STATUS
from ..i18n import STRINGS
from ..model import (
    ArenaPlayer,
    BattleBadges,
    asked_account_ids,
    badges_request,
    marked_vehicle_ids,
    parse_badges,
    show_own,
)
from ..model.constants import BADGES_PATH
from ..settings import SCHEMA, SECTION, SWITCH
from .flash import PageBridge, set_library


def arena_infos():
    provider = arena_dp()
    return list(provider.getVehiclesInfoIterator()) if provider is not None else []


def arena_players(infos):
    players = []
    for info in infos:
        player = getattr(info, 'player', None)
        players.append(ArenaPlayer(
            account_id=getattr(player, 'accountDBID', 0),
            name=getattr(player, 'name', None),
            fake_name=getattr(player, 'fakeName', ''),
            is_bot=bool(getattr(player, 'isEventBot', False)),
        ))
    return players


def arena_vehicles(infos):
    return [(getattr(info, 'vehicleID', None), getattr(getattr(info, 'player', None), 'accountDBID', None))
            for info in infos]


class PackBadge(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        self.badges = BattleBadges()
        self.hooks = BattleHooks()
        self.bridge = PageBridge()
        self.sync_library()
        bus = app.bus
        bus.on('hangar', self.sync_library)
        bus.on('enqueued', self.sync_library)
        bus.on('battle_ready', self._on_battle_ready)
        bus.on('battle_leave', self._on_battle_leave)

    # The battle app reads BATTLE_REQUIRED_LIBRARIES when it is created, so the switch is applied before every battle.
    def sync_library(self, *args):
        set_library(self.enabled())

    # RU 1.45 client source: Avatar.py builds ClientArena from the avatar's own arenaUniqueID.
    def _on_battle_ready(self, player):
        if not self.enabled():
            return
        # The own badge marks this install, as Near_You's does: it needs no binding and nothing is sent for it.
        own_id = own_account_id(player) if show_own(self.app.config) else None
        arena_id = getattr(player, 'arenaUniqueID', None)
        self.badges.start(arena_id, own_id)
        log('pack badge swf: own row %s' % ('marked' if own_id else 'not marked'))
        self.bridge.start()
        self.show()
        self.request(arena_id)
        self.hooks.add(arena, 'onVehicleAdded', lambda *args: self._on_vehicle_added(arena_id))

    def _on_battle_leave(self):
        self.hooks.clear()
        self.badges.stop()
        self.bridge.stop()

    def _on_vehicle_added(self, arena_id):
        self.request(arena_id)
        self.show()

    def show(self):
        if not self.badges.marked:
            return
        self.bridge.show(marked_vehicle_ids(arena_vehicles(arena_infos()), self.badges.marked))

    def _can_request(self, arena_id):
        if self.badges.requested or arena_id != self.badges.arena_id:
            return False
        return self.app.is_bound() and not self.app.auth_failed

    def request(self, arena_id):
        app = self.app
        if not self._can_request(arena_id):
            return
        asked = asked_account_ids(arena_players(arena_infos()), app.account_id)
        try:
            payload = badges_request(app.current_credentials(), asked)
        except ReasonError as error:
            log('pack badge swf: not requested: %s' % error.reason)
            return

        self.badges.requested = True

        def done(status, data, retry_after):
            if status != OK_STATUS:
                log('pack badge swf: the site answered %s' % status)
                return
            if self.badges.answered(arena_id, parse_badges(data, frozenset(asked))):
                log('pack badge swf: the site answered, %d marked accounts' % len(self.badges.marked))
                self.show()

        post_signed(app, BADGES_PATH, payload, done)

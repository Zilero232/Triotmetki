from __future__ import absolute_import, division, print_function, unicode_literals

import weakref

from ....core.client.battle import BattleHooks, arena, arena_dp
from ....core.client.component import FeatureComponent
from ....core.client.game import client_attr
from ....core.client.me import post_signed
from ....core.errors import ReasonError
from ....core.hooks import override
from ....core.log import log, safe
from ....core.me import OK_STATUS
from ..i18n import STRINGS
from ..model import ArenaPlayer, BattleBadges, asked_account_ids, badges_request, decorate, parse_badges, show_own
from ..model.constants import BADGES_PATH
from ..settings import SCHEMA, SECTION, SWITCH
from .constants import STATS_CONTROLLER_CLASS, STATS_CONTROLLER_MODULE, VEHICLE_INFO_CLASS, VEHICLE_INFO_MODULE


def arena_players():
    provider = arena_dp()
    if provider is None:
        return []
    players = []
    for info in provider.getVehiclesInfoIterator():
        player = getattr(info, 'player', None)
        players.append(ArenaPlayer(
            account_id=getattr(player, 'accountDBID', 0),
            name=getattr(player, 'name', None),
            fake_name=getattr(player, 'fakeName', ''),
            is_bot=bool(getattr(player, 'isEventBot', False)),
        ))
    return players


class PackBadge(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, SECTION, SCHEMA, SWITCH, STRINGS)
        self.badges = BattleBadges()
        self.hooks = BattleHooks()
        self.controller = None
        self.clearing = False
        self._hook_client()
        bus = app.bus
        bus.on('battle_ready', self._on_battle_ready)
        bus.on('battle_leave', self._on_battle_leave)

    def _hook_client(self):
        component = client_attr(VEHICLE_INFO_MODULE, VEHICLE_INFO_CLASS)
        controller = client_attr(STATS_CONTROLLER_MODULE, STATS_CONTROLLER_CLASS)
        if component is None or controller is None:
            log('pack badge: the player panel data classes were not found, no badges')
            return
        override(component, 'addVehicleInfo')(self._add_vehicle_info)
        override(controller, 'startControl')(self._start_control)
        override(controller, 'stopControl')(self._stop_control)

    def _add_vehicle_info(self, original, component, *args, **kwargs):
        result = original(component, *args, **kwargs)
        if self.enabled() and self.badges.marked:
            decorate(component.get(), self.badges.marked, self.settings.get('stock_badge'), self.clearing)
        return result

    def _start_control(self, original, controller, *args, **kwargs):
        result = original(controller, *args, **kwargs)
        self.controller = weakref.ref(controller)
        return result

    def _stop_control(self, original, controller, *args, **kwargs):
        self.controller = None
        return original(controller, *args, **kwargs)

    # RU 1.45 client source: Avatar.py builds ClientArena from the avatar's own arenaUniqueID.
    def _on_battle_ready(self, player):
        if not self.enabled():
            return
        app = self.app
        own_account_id = app.account_id if app.is_bound() and show_own(app.config) else None
        arena_id = getattr(player, 'arenaUniqueID', None)
        self.badges.start(arena_id, own_account_id)
        self.refresh()
        self.request(arena_id)
        if not self.badges.requested:
            self.hooks.add(arena, 'onVehicleAdded', lambda *args: self.request(arena_id))

    def _on_battle_leave(self):
        self.hooks.clear()
        self.badges.stop()

    def request(self, arena_id):
        app = self.app
        if self.badges.requested or arena_id != self.badges.arena_id or not app.is_bound() or app.auth_failed:
            return
        asked = asked_account_ids(arena_players(), app.account_id)
        try:
            payload = badges_request(app.current_credentials(), asked)
        except ReasonError as error:
            log('pack badge: not requested: %s' % error.reason)
            return

        self.badges.requested = True

        def done(status, data, retry_after):
            if status != OK_STATUS:
                log('pack badge: the site answered %s' % status)
                return
            if self.badges.answered(arena_id, parse_badges(data, frozenset(asked))):
                self.refresh()

        post_signed(app, BADGES_PATH, payload, done)

    @safe
    def refresh(self):
        controller = self.controller() if self.controller is not None else None
        provider = arena_dp()
        if controller is None or provider is None:
            return
        self.clearing = True
        try:
            controller.invalidateVehiclesInfo(provider)
        finally:
            self.clearing = False
        controller.invalidateVehiclesInfo(provider)

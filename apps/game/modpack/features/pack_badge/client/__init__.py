from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.client.battle import BattleHooks, arena, arena_dp, own_account_id
from ....core.client.component import FeatureComponent
from ....core.client.me import post_json
from ....core.client.timer import Ticker
from ....core.events import EVENT_COMPONENT_SETTINGS
from ....core.log import log
from ....core.me import OK_STATUS
from ..i18n import STRINGS
from ..model import (
    ArenaPlayer,
    BadgeSwitch,
    BattleBadges,
    arena_names,
    asked_account_ids,
    marked_vehicle_ids,
    parse_badges,
    presence_request,
    show_own,
)
from ..model.constants import PRESENCE_PATH
from ..settings import SCHEMA, SECTION, SWITCH
from .constants import LOOKUP_BATCH_S
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
        self.bridge = PageBridge(self._on_page_found)
        self.added_lookup = Ticker(LOOKUP_BATCH_S, self._ask_added)
        self.own_switch = BadgeSwitch(self.shows_own())
        self.last_own_account_id = None
        self.page_found = False
        self.sync_library()
        bus = app.bus
        bus.on('hangar', self._on_hangar)
        bus.on('enqueued', self.sync_library)
        bus.on(EVENT_COMPONENT_SETTINGS, self._on_settings_changed)
        bus.on('battle_ready', self._on_battle_ready)
        bus.on('battle_leave', self._on_battle_leave)

    def shows_own(self):
        return self.enabled() and show_own(self.app.config)

    # The battle app reads BATTLE_REQUIRED_LIBRARIES when it is created, so the switch is applied before every battle.
    def sync_library(self, *args):
        set_library(self.enabled())

    def _on_hangar(self):
        self.sync_library()
        self.report_switch_off()

    def _on_settings_changed(self, component_id, changed):
        self.report_switch_off()

    # The whole mod, the plate or "show my badge" switched off deletes the own presence on the server at once.
    def report_switch_off(self):
        if self.app.in_battle:
            return
        if not self.own_switch.switched_off(self.shows_own()):
            return

        own_id = getattr(self.app, 'account_id', None) or self.last_own_account_id
        if not own_id:
            log('pack badge swf: switched off before any own account was known, nothing to delete')
            return

        payload = presence_request(own_id, False, [])
        post_json(self.app, PRESENCE_PATH, payload, self._on_hidden)

    def _on_hidden(self, status, data, retry_after):
        log('pack badge swf: the switch off was reported, the site answered %s' % status)

    # RU 1.45 client source: Avatar.py builds ClientArena from the avatar's own arenaUniqueID.
    def _on_battle_ready(self, player):
        if not self.enabled():
            return

        visible = show_own(self.app.config)
        arena_id = getattr(player, 'arenaUniqueID', None)
        own_id = own_account_id(player)
        self.last_own_account_id = own_id or self.last_own_account_id
        self.badges.start(arena_id, own_id, visible)
        self.page_found = False
        log('pack badge swf: own row %s' % ('marked' if self.badges.marked else 'not marked'))

        self.bridge.start()
        self.show('battle start')
        self.hooks.add(arena, 'onVehicleAdded', self._on_vehicle_added)
        # The loading screen changes with the arena period, a few times a battle.
        self.hooks.add(arena, 'onPeriodChange', lambda *args: self.show('arena period'))

    def _on_battle_leave(self):
        self.hooks.clear()
        self.added_lookup.stop()
        self.page_found = False
        self.badges.stop()
        self.bridge.stop()

    # Only a battle page with the players panel (PAGE_ALIASES) draws the plate, so only its battles ask the site.
    def _on_page_found(self):
        if self.page_found:
            return

        self.page_found = True
        self.request()

    def _on_vehicle_added(self, *args):
        self.show('vehicle added')
        if self.page_found:
            self.added_lookup.start()

    def _ask_added(self):
        self.request()
        return False

    def show(self, reason):
        if not self.badges.marked:
            return

        infos = arena_infos()
        marked = self.badges.marked
        vehicle_ids = marked_vehicle_ids(arena_vehicles(infos), marked)
        names, other_names = arena_names(arena_players(infos), marked)

        self.bridge.show(vehicle_ids, names, other_names, reason)

    def request(self):
        badges = self.badges
        arena_id = badges.arena_id
        players = arena_players(arena_infos())
        asked = badges.lookup(asked_account_ids(players, badges.own_account_id))
        if asked is None:
            return

        payload = presence_request(badges.own_account_id, badges.visible, asked)

        def done(status, data, retry_after):
            if status != OK_STATUS:
                log('pack badge swf: the site answered %s' % status)
                return
            if badges.answered(arena_id, parse_badges(data, frozenset(asked))):
                log('pack badge swf: the site answered, %d marked accounts' % len(badges.marked))
                self.show('site answer')

        post_json(self.app, PRESENCE_PATH, payload, done)

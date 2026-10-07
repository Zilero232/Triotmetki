from __future__ import absolute_import, division, print_function, unicode_literals

import time

from ....core.client.battle import (
    BattleHooks,
    ammo,
    arena,
    arena_dp,
    call,
    controls_own_vehicle,
    damage_source,
    dealt_damage,
    feedback,
    is_enemy,
    player,
    vehicle_class,
    vehicle_info,
    vehicle_name,
    vehicle_state,
)
from ....core.client.component import FeatureComponent
from ....core.client.game import values_by_name
from ....core.log import log
from .. import FEATURE_ID
from ..i18n import STRINGS
from ..model import (
    AutoMessages,
    crossed,
    device_trigger,
    hp_percent,
    is_last_alive,
    is_low_hp,
    is_spotted_alert,
    received_trigger,
    reload_seconds,
    round_result,
)
from ..model.constants import (
    DAMAGE_MILESTONE,
    FIRE,
    FIRE_OUT,
    FRAG,
    GG,
    GREETING,
    LAST_ALIVE,
    LOW_HP,
    RELOAD,
    RESULT_KEY,
    SPOTTED,
)
from ..settings import SCHEMA, SWITCH
from .chat import is_chat_ban, messenger_events, send_extra, send_line
from .constants import DEVICES, EVENT_KINDS, FIRE_STATE, HEALTH, KILL, OBSERVED, RECEIVED, VEHICLE_STATES

try:
    from BattleFeedbackCommon import BATTLE_EVENT_TYPE
except ImportError:
    BATTLE_EVENT_TYPE = None

try:
    from gui.battle_control.battle_constants import VEHICLE_VIEW_STATE
except ImportError:
    VEHICLE_VIEW_STATE = None

try:
    from constants import ARENA_PERIOD
except ImportError:
    ARENA_PERIOD = None

try:
    from PlayerEvents import g_playerEvents
except ImportError:
    g_playerEvents = None


def _own_id():
    return getattr(player(), 'playerVehicleID', None)


def _team_counts(own_team):
    allies, enemies, size = 0, 0, 0
    provider = arena_dp()
    own_id = _own_id()
    for info in (provider.getVehiclesInfoIterator() if provider is not None else ()):
        alive = bool(call(info, 'isAlive', True))
        if info.team != own_team:
            enemies += int(alive)
            continue
        size += 1
        if info.vehicleID != own_id:
            allies += int(alive)
    return allies, enemies, size


# Fair play: only the player's own feedback, the own vehicle's states and gun, the sixth sense lamp and the team lists'
# alive counts; every line goes out through the client's own chat call (client/chat.py) with its own limits.
class AutoMessagesFeature(FeatureComponent):

    def __init__(self, app):
        FeatureComponent.__init__(self, app, FEATURE_ID, SCHEMA, SWITCH, STRINGS)
        self.kinds = values_by_name(BATTLE_EVENT_TYPE, EVENT_KINDS)
        self.states = values_by_name(VEHICLE_VIEW_STATE, VEHICLE_STATES)
        self.hooks = BattleHooks()
        self.messages = None
        self.own_battle = False
        self.battle = {}
        app.bus.on('battle_ready', self._on_battle_ready)
        app.bus.on('battle_leave', self._on_battle_leave)

    def _on_battle_ready(self, avatar):
        self.own_battle = True
        self._stop()
        if self.enabled():
            self._start(avatar)

    def _on_battle_leave(self):
        self.own_battle = False
        self._stop()

    def settings_changed(self, changed):
        if not self.own_battle:
            return
        if not self.enabled():
            self._stop()
        elif self.messages is None:
            self._start(player())

    def _start(self, avatar):
        self.messages = AutoMessages(self.settings, self.app.translate)
        own = vehicle_info(_own_id())
        self.battle = {
            'team': getattr(avatar, 'team', None),
            'max_hp': getattr(getattr(own, 'vehicleType', None), 'maxHealth', None),
            'hp': None,
            'damage': 0,
            'frags': 0,
            'on_fire': False,
        }
        self.hooks.add(feedback, 'onPlayerFeedbackReceived', self._on_feedback)
        self.hooks.add(vehicle_state, 'onVehicleStateUpdated', self._on_vehicle_state)
        self.hooks.add(ammo, 'onGunReloadTimeSet', self._on_reload)
        self.hooks.add(arena, 'onPeriodChange', self._on_period)
        self.hooks.add(arena, 'onVehicleKilled', self._on_vehicle_killed)
        self.hooks.add(lambda: g_playerEvents, 'onRoundFinished', self._on_round_finished)
        self.hooks.add(messenger_events, 'onErrorReceived', self._on_chat_error)

    def _stop(self):
        self.hooks.clear()
        self.messages = None
        self.battle = {}

    def _common_values(self):
        battle = self.battle
        return {
            'tank': vehicle_name(_own_id()),
            'hp': battle.get('hp') if battle.get('hp') is not None else battle.get('max_hp'),
            'damage': battle.get('damage'),
            'frags': battle.get('frags'),
        }

    def _in_battle_period(self):
        battle_period = getattr(ARENA_PERIOD, 'BATTLE', None)
        return battle_period is not None and getattr(arena(), 'period', None) == battle_period

    def _say(self, trigger, values=None, any_period=False):
        if self.messages is None or not (any_period or self._in_battle_period()):
            return False

        now = time.time()
        merged = self._common_values()
        merged.update(values or {})
        text = self.messages.compose(trigger, merged, now)
        if not text or not send_line(self.settings.get('channel'), text):
            return False

        self.messages.record(trigger, now)
        log('auto messages: %s sent' % trigger)
        return True

    def _on_feedback(self, events):
        if self.messages is None or not controls_own_vehicle():
            return
        for event in events:
            self._on_event(event)
        self._add_damage(dealt_damage(events))

    def _on_event(self, event):
        kind = self.kinds.get(event.getBattleEventType())
        target = event.getTargetID()
        if kind == KILL and is_enemy(target):
            self.battle['frags'] += 1
            self._say(FRAG, {'vehicle': vehicle_name(target)})
        elif kind == RECEIVED:
            self._on_received(target, event.getExtra())

    # The attacker is the one the stock damage log names for this hit (its class too): nothing else about it.
    def _on_received(self, attacker, extra):
        if extra is None or not attacker or attacker == _own_id():
            return
        team = getattr(vehicle_info(attacker), 'team', None)
        enemy = is_enemy(attacker)
        trigger = received_trigger(damage_source(extra), vehicle_class(attacker), enemy, bool(team) and not enemy)
        if trigger is not None:
            self._say(trigger, {'vehicle': vehicle_name(attacker), 'hit': call(extra, 'getDamage')})

    def _add_damage(self, amount):
        if not amount:
            return
        previous = self.battle['damage']
        self.battle['damage'] = previous + amount
        if crossed(previous, self.battle['damage'], self.settings.get('damage_milestone_value')):
            self._say(DAMAGE_MILESTONE)

    def _on_vehicle_state(self, state, value):
        name = self.states.get(state)
        if self.messages is None or name is None or not controls_own_vehicle():
            return
        if name == OBSERVED and value:
            self._on_spotted()
        elif name == FIRE_STATE:
            self._on_fire(bool(value))
        elif name == DEVICES and isinstance(value, (list, tuple)) and len(value) >= 2:
            self._say_trigger(device_trigger(value[0], value[1]))
        elif name == HEALTH:
            self._on_health(value)

    def _say_trigger(self, trigger):
        if trigger is not None:
            self._say(trigger)

    def _on_spotted(self):
        allies, _, _ = _team_counts(self.battle.get('team'))
        if not is_spotted_alert(allies, self.settings.get('spotted_allies')):
            return
        if self._say(SPOTTED, {'allies': allies}):
            send_extra(self.settings.get('spotted_extra'), call(player(), 'getOwnVehiclePosition'))

    def _on_fire(self, burning):
        was_burning = self.battle.get('on_fire')
        self.battle['on_fire'] = burning
        if burning and not was_burning:
            self._say(FIRE)
        elif was_burning and not burning:
            self._say(FIRE_OUT)

    def _on_health(self, health):
        self.battle['hp'] = health
        max_hp = self.battle.get('max_hp')
        if is_low_hp(health, max_hp, self.settings.get('low_hp_percent')):
            self._say(LOW_HP, {'percent': hp_percent(health, max_hp)})

    def _on_reload(self, shell, snapshot, *args):
        if self.messages is None or not controls_own_vehicle():
            return
        actual, base = call(snapshot, 'getActualValue'), call(snapshot, 'getBaseValue')
        seconds = reload_seconds(actual, base, self.settings.get('reload_min_s'))
        if seconds is not None:
            self._say(RELOAD, {'seconds': seconds})

    def _on_period(self, period, *args):
        if period == getattr(ARENA_PERIOD, 'BATTLE', None):
            self._say(GREETING, any_period=True)

    def _on_vehicle_killed(self, *args):
        allies, enemies, size = _team_counts(self.battle.get('team'))
        own_alive = call(vehicle_info(_own_id()), 'isAlive', False)
        if is_last_alive(own_alive, allies, size):
            self._say(LAST_ALIVE, {'enemies': enemies})

    def _on_round_finished(self, winner_team, *args):
        result = round_result(winner_team, self.battle.get('team'))
        self._say(GG, {'result': self.app.translate(RESULT_KEY % result)}, any_period=True)

    def _on_chat_error(self, error, *args):
        if self.messages is not None and is_chat_ban(error):
            self.messages.mute()
            log('auto messages: the chat is banned, no more lines this battle')

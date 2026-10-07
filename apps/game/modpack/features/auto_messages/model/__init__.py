from __future__ import absolute_import, division, print_function, unicode_literals

import random

from ....core.compat import is_number, to_text
from ....core.format import single_spaces
from .constants import (
    AMMO_RACK,
    AMMO_RACK_DEVICE,
    ARTY_CLASS,
    ARTY_HIT,
    ATTACKER_SOURCES,
    COOLDOWNS,
    CREW,
    CREW_ROLES,
    DEFAULT_TEXT_KEY,
    DEFEAT,
    DESTROYED,
    DRAW,
    FRESH_RELOAD_S,
    HIT_STATES,
    MAX_LINE_CHARS,
    ONCE,
    PLACEHOLDER,
    RAMMED,
    RATE_MAX_LINES,
    RATE_WINDOW_S,
    SOURCE_RAM,
    SOURCE_SHOT,
    TEAM_DAMAGE,
    TEXT_SUFFIX,
    TRACK_PREFIXES,
    TRACKS,
    VARIANT_SEPARATOR,
    WIN,
)

# Fair play: only own events the client already shows; no enemy positions, reloads, aim or spotting.


def variants(text):
    parts = (single_spaces(part) for part in to_text(text or u'').split(VARIANT_SEPARATOR))
    return [part for part in parts if part]


def render(template, values):
    def value_of(match):
        value = values.get(match.group(1))
        return u'' if value is None else to_text(value)

    return single_spaces(PLACEHOLDER.sub(value_of, to_text(template)))[:MAX_LINE_CHARS]


def received_trigger(source, attacker_class, is_enemy, is_ally):
    if is_ally:
        return TEAM_DAMAGE if source in ATTACKER_SOURCES else None
    if not is_enemy:
        return None
    if source == SOURCE_RAM:
        return RAMMED
    if source == SOURCE_SHOT and attacker_class == ARTY_CLASS:
        return ARTY_HIT
    return None


def device_trigger(name, state):
    name = to_text(name or u'')
    if name == AMMO_RACK_DEVICE:
        return AMMO_RACK if state in HIT_STATES else None
    if state != DESTROYED:
        return None
    if name.startswith(CREW_ROLES):
        return CREW
    if name.startswith(TRACK_PREFIXES):
        return TRACKS
    return None


def is_low_hp(health, max_health, percent):
    if not is_number(health) or not is_number(max_health) or health <= 0 or max_health <= 0:
        return False
    return health * 100 <= max_health * percent


def hp_percent(health, max_health):
    if not is_number(health) or not is_number(max_health) or max_health <= 0:
        return None
    return int(round(health * 100.0 / max_health))


def reload_seconds(actual, base, minimum):
    if not actual or actual < minimum:
        return None
    if base and base - actual > FRESH_RELOAD_S:
        return None
    return int(round(actual))


def is_shot(before, after):
    if before is None or after is None:
        return False
    return after[0] < before[0] or after[1] < before[1]


def crossed(previous, total, threshold):
    return threshold > 0 and previous < threshold <= total


def round_result(winner_team, own_team):
    if not winner_team:
        return DRAW
    return WIN if winner_team == own_team else DEFEAT


def is_last_alive(own_alive, allies_alive, team_size):
    return bool(own_alive) and team_size > 1 and allies_alive == 0


def is_spotted_alert(allies_alive, limit):
    return allies_alive is not None and allies_alive <= limit


class AutoMessages(object):

    def __init__(self, settings, translate, choose=random.choice):
        self.settings = settings
        self.translate = translate
        self.choose = choose
        self.last = {}
        self.sent = []
        self.muted = False

    def mute(self):
        self.muted = True

    def compose(self, trigger, values, now):
        if self.muted or not self.settings.get(trigger):
            return None
        if not self._trigger_ready(trigger, now) or not self._rate_ready(now):
            return None

        options = self._options(trigger)
        if not options:
            return None
        return render(self.choose(options), values) or None

    def _options(self, trigger):
        own = variants(self.settings.get(trigger + TEXT_SUFFIX))
        return own or variants(self.translate(DEFAULT_TEXT_KEY % trigger))

    def record(self, trigger, now):
        self.last[trigger] = now
        self.sent.append(now)

    def _trigger_ready(self, trigger, now):
        if trigger not in self.last:
            return True
        cooldown = COOLDOWNS.get(trigger, ONCE)
        return cooldown is not ONCE and now - self.last[trigger] >= cooldown

    def _rate_ready(self, now):
        self.sent = [moment for moment in self.sent if now - moment < RATE_WINDOW_S]
        if len(self.sent) >= RATE_MAX_LINES:
            return False
        if not self.sent:
            return True
        return now - self.sent[-1] >= self.settings.get('min_interval_s')

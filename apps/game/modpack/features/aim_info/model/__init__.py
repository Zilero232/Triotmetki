from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from ....core.format import format_number
from .constants import BODY_CLOSE, BODY_OPEN, EXTRA_LINES, FULL_LINES, LINE_BREAK

# Fair play: only the player's own shells (their descriptor and the own gun's settings) and the reticle the client
# already draws for the player; nothing about other vehicles beyond the distance the client measures to the vehicle
# under the reticle, which its markers can already show.


def _number(value):
    return value if is_number(value) and not isinstance(value, bool) and value > 0 else None


def shell_stats(damage, piercing, speed, speed_factor):
    """The numbers of an own shell: `damage` is the descriptor's (armour, devices) pair, `piercing` the gun's piercing
    power at 100 m, `speed` its shot speed in world units, `speed_factor` the client's projectile speed factor."""
    armor, devices = damage if isinstance(damage, (tuple, list)) and len(damage) == 2 else (None, None)
    factor = _number(speed_factor)
    return {
        'damage': _number(armor),
        'module_damage': _number(devices),
        'piercing': _number(piercing),
        'speed': _number(speed) / factor if _number(speed) and factor else None,
    }


def shell_lines(stats, translate, full):
    """The tooltip lines of an own shell: every number (`full`, the stock tooltip has no body) or the module damage
    the stock body leaves out; a number the client did not give is left out."""
    keys = FULL_LINES if full else EXTRA_LINES
    return [translate(key, value=format_number(stats[name])) for name, key in keys if stats.get(name) is not None]


def with_lines(tooltip, lines):
    """The stock tooltip with `lines` added at the end of its body (a body is added when it has none)."""
    if not lines:
        return tooltip
    added = LINE_BREAK.join(lines)
    if BODY_CLOSE in tooltip:
        head, _, tail = tooltip.rpartition(BODY_CLOSE)
        return head + LINE_BREAK + added + BODY_CLOSE + tail
    return tooltip + BODY_OPEN + added + BODY_CLOSE


def has_body(tooltip):
    return BODY_CLOSE in tooltip

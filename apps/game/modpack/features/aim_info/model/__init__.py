from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from ....core.format import format_number
from .constants import BODY_CLOSE, BODY_OPEN, EXTRA_LINES, FULL_LINES, LINE_BREAK

# Fair play: only the own shells and the distance the client already measures under the reticle.


def _number(value):
    return value if is_number(value) and value > 0 else None


def shell_stats(damage, piercing, speed, speed_factor):
    armor, devices = damage if isinstance(damage, (tuple, list)) and len(damage) == 2 else (None, None)
    factor = _number(speed_factor)
    return {
        'damage': _number(armor),
        'module_damage': _number(devices),
        'piercing': _number(piercing),
        'speed': _number(speed) / factor if _number(speed) and factor else None,
    }


def shell_lines(stats, translate, full):
    keys = FULL_LINES if full else EXTRA_LINES
    return [translate(key, value=format_number(stats[name])) for name, key in keys if stats.get(name) is not None]


def with_lines(tooltip, lines):
    if not lines:
        return tooltip
    added = LINE_BREAK.join(lines)
    if BODY_CLOSE in tooltip:
        head, _, tail = tooltip.rpartition(BODY_CLOSE)
        return head + LINE_BREAK + added + BODY_CLOSE + tail
    return tooltip + BODY_OPEN + added + BODY_CLOSE


def has_body(tooltip):
    return BODY_CLOSE in tooltip

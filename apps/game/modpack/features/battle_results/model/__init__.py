from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import as_int, is_int
from ....core.moe import rating_change
from ....core.format import COLOR_DOWN, COLOR_UP, font, format_number
from ....core.templates import render
from ..settings.constants import BONUS_ALL
from .constants import ASSIST_KEYS, COST_KEYS, RANDOM_BONUS_TYPE, RESULT_COLORS, STAT_FIELDS
from .notice import APPEND, HOLD, PUSH, StockNotices, arena_key, with_lines  # noqa: F401
from .page import build_page, compact, page_actions, restore_history, session_of, trimmed  # noqa: F401
from .text import percent_text, result_label, signed


def moe_percent(damage_rating):
    if not is_int(damage_rating):
        return None
    return round(damage_rating / 100, 2)


def _battle_fields(event, map_label):
    vehicle = event.get('vehicle') or {}
    return {
        'result': event.get('result'),
        'bonus_type': event.get('bonus_type'),
        'vehicle': vehicle.get('name') or '',
        'tier': vehicle.get('tier'),
        'map': map_label or event.get('map_name') or '',
        'arena': event.get('arena_unique_id'),
        'time': event.get('occurred_at'),
        'duration': as_int(event.get('duration_s')),
    }


def _stat_fields(stats):
    fields = {key: as_int(stats.get(source)) for key, source in STAT_FIELDS.items()}
    fields['alive'] = bool(stats.get('is_alive'))
    fields['assist'] = sum(fields[key] for key in ASSIST_KEYS)
    fields['net_credits'] = fields['credits'] - sum(fields[key] for key in COST_KEYS)
    return fields


def _moe_fields(moe):
    return {
        'marks_on_gun': moe.get('marks_on_gun'),
        'moe_percent': moe_percent(moe.get('damage_rating')),
        'moving_avg': moe.get('moving_avg_damage'),
    }


def _difference(after, before):
    if is_int(after) and is_int(before):
        return after - before
    return None


def _moe_deltas(summary, before, after):
    return {
        'moe_delta': rating_change(before.get('damage_rating'), after.get('damage_rating')),
        'moving_avg_delta': _difference(summary['moving_avg'], before.get('moving_avg_damage')),
        'marks_delta': _difference(summary['marks_on_gun'], before.get('marks_on_gun')),
    }


def build_summary(event, moe_before=None, map_label=None):
    summary = _battle_fields(event, map_label)
    summary.update(_stat_fields(event.get('stats') or {}))
    summary.update(_moe_fields(event.get('moe') or {}))

    if summary['bonus_type'] != RANDOM_BONUS_TYPE:
        moe_before = None
    summary.update(_moe_deltas(summary, moe_before or {}, event.get('moe') or {}))

    return summary


def counts(summary, bonus_types):
    if bonus_types == BONUS_ALL:
        return True
    return summary.get('bonus_type') == RANDOM_BONUS_TYPE


def colored(text, color, enabled):
    if enabled and color:
        return font(text, color)
    return text


def _delta_color(value):
    if value is None or value == 0:
        return None
    if value > 0:
        return COLOR_UP
    return COLOR_DOWN


def delta(value, colors, percent=False):
    return colored(signed(value, percent), _delta_color(value), colors)


def macro_values(summary, translate):
    values = dict(summary)
    values.update({
        'result': result_label(summary.get('result'), translate),
        'moe_percent': percent_text(summary.get('moe_percent')),
        'moe_delta': signed(summary.get('moe_delta'), True),
        'moving_avg_delta': signed(summary.get('moving_avg_delta')),
        'marks_delta': signed(summary.get('marks_delta')),
    })
    return values


def _head_line(summary, colors, translate):
    head = translate(
        'br_head',
        result=result_label(summary.get('result'), translate),
        vehicle=summary['vehicle'],
        map=summary['map'],
    )
    return colored(head, RESULT_COLORS.get(summary.get('result')), colors)


def _economy_line(summary, translate):
    return translate(
        'br_economy',
        xp=format_number(summary['xp']),
        credits=format_number(summary['credits']),
    )


def _combat_line(summary, translate):
    return translate(
        'br_combat',
        damage=format_number(summary['damage']),
        assist=format_number(summary['assist']),
        blocked=format_number(summary['blocked']),
        frags=summary['frags'],
        spotted=summary['spotted'],
    )


def _marks_line(summary, colors, translate):
    line = translate(
        'br_marks',
        percent=percent_text(summary['moe_percent']),
        marks=summary.get('marks_on_gun') or 0,
    )

    if summary.get('moe_delta') is not None:
        line += ' (%s)' % delta(summary['moe_delta'], colors, True)
    if summary.get('moving_avg_delta') is not None:
        line += ', ' + translate('br_moving_avg', delta=delta(summary['moving_avg_delta'], colors))

    return line


def format_summary(summary, settings, translate):
    if settings.get('template'):
        return render(settings.get('template'), macro_values(summary, translate))

    colors = settings.get('colored')
    lines = [_head_line(summary, colors, translate)]
    if settings.get('show_economy'):
        lines.append(_economy_line(summary, translate))
    if settings.get('show_combat'):
        lines.append(_combat_line(summary, translate))
    if settings.get('show_marks') and summary.get('moe_percent') is not None:
        lines.append(_marks_line(summary, colors, translate))

    return '\n'.join(lines)


# The lines added to the stock post-battle message: it already names the result, the map, the tank, the XP and the
# credits, so only the combat numbers and the MoE change are added (or the player's own template).
def stock_lines(summary, settings, translate):
    if settings.get('template'):
        return [render(settings.get('template'), macro_values(summary, translate))]

    lines = []
    if settings.get('show_combat'):
        lines.append(_combat_line(summary, translate))
    if settings.get('show_marks') and summary.get('moe_percent') is not None:
        lines.append(_marks_line(summary, settings.get('colored'), translate))
    return lines

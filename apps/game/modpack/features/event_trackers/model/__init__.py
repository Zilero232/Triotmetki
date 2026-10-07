# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number
from ....core.format import COLOR_MUTED, COLOR_NEUTRAL, COLOR_UP, counted, font, format_number
from .constants import DAY_S, HOUR_S, MINUTE_S, TIER_NUMERALS, TITLE_SIZE_STEP
from .triathlon import best_battles, left_s, score

# Fair play: the own token count and own battles only.


def remaining(seconds, translate):
    seconds = max(0, int(seconds))
    if seconds >= DAY_S:
        return _days_and_hours(seconds, translate)
    if seconds >= HOUR_S:
        return counted(seconds // HOUR_S, 'hours', translate)
    minutes = max(1, (seconds + MINUTE_S - 1) // MINUTE_S)
    return counted(minutes, 'minutes', translate)


def _days_and_hours(seconds, translate):
    days = counted(seconds // DAY_S, 'days', translate)
    hours = (seconds % DAY_S) // HOUR_S
    if not hours:
        return days
    return u'%s %s' % (days, counted(hours, 'hours', translate))


def _positive_int(value):
    if is_number(value) and value > 0:
        return int(value)
    return None


def clean_caravan(raw):
    if not isinstance(raw, dict):
        return None
    return {
        'coins': _positive_int(raw.get('coins')) or 0,
        'finish': _positive_int(raw.get('finish')),
    }


def caravan_time_left(caravan, now):
    if caravan['finish'] is None or caravan['finish'] <= now:
        return None
    return caravan['finish'] - now


def _round_state(last, now, translate):
    if last is None:
        return translate('event_trackers_round_none')
    seconds_left = left_s(last, now)
    if seconds_left > 0:
        return translate('event_trackers_round_left', time=remaining(seconds_left, translate))
    return translate('event_trackers_round_over')


def triathlon_view(rounds, event, now, translate):
    cardinality = event['cardinality']
    last = rounds.last()
    tier = TIER_NUMERALS.get(event['min_tier'], u'')

    view = {
        'title': event['name'] or translate('event_trackers_triathlon'),
        'score': None,
        'state': _round_state(last, now, translate),
        'running': last is not None and left_s(last, now) > 0,
        'battles': [],
        'count': 0,
        'best': rounds.best_score(cardinality, event['start']),
        'rule': translate('event_trackers_triathlon_rule', count=cardinality, tier=tier),
    }
    if last is not None:
        view['score'] = score(last, cardinality)
        view['battles'] = best_battles(last, cardinality)
        view['count'] = len(last['battles'])
    return view


def format_triathlon(view, settings, translate):
    size = settings.get('font_size')
    value = format_number(view['score']) if view['score'] is not None else u'-'
    state_color = COLOR_UP if view['running'] else COLOR_MUTED

    lines = [
        font(u'%s: %s' % (view['title'], value), COLOR_NEUTRAL, size + TITLE_SIZE_STEP),
        font(view['state'], state_color, size),
    ]
    for place, battle in enumerate(view['battles'], 1):
        line = u'%d. %s — %s' % (place, battle['tank'] or u'-', format_number(battle['xp']))
        lines.append(font(line, COLOR_NEUTRAL, size))
    if view['count']:
        battles = counted(view['count'], 'battles', translate)
        lines.append(font(translate('event_trackers_round_battles', battles=battles), COLOR_MUTED, size))
    if view['best'] is not None:
        best = format_number(view['best'])
        lines.append(font(translate('event_trackers_best_round_line', score=best), COLOR_MUTED, size))
    return u'\n'.join(lines)


def format_caravan(caravan, now, settings, translate):
    size = settings.get('font_size')
    tokens = counted(caravan['coins'], 'tokens', translate)
    lines = [font(translate('event_trackers_caravan_line', tokens=tokens), COLOR_NEUTRAL, size + TITLE_SIZE_STEP)]

    time_left = caravan_time_left(caravan, now)
    if time_left is not None:
        ends_in = translate('event_trackers_ends_in', time=remaining(time_left, translate))
        lines.append(font(ends_in, COLOR_MUTED, size))
    return u'\n'.join(lines)

from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_int, is_number
from ....core.format import format_epoch, format_number, format_percent, format_timer
from .constants import (
    ACTION_CLEAR,
    ACTION_HITS,
    COST_KEYS,
    HISTORY_KEYS,
    MAX_BATTLE_DELTA,
    SESSION_ROW,
    SITE_BATTLES_PATH,
    WRONG_SCALE_PERCENT,
)
from .hits import hits_row, with_hits
from .text import result_label, signed


def compact(summary):
    return dict((key, summary.get(key)) for key in HISTORY_KEYS)


# 0.7.0 stored the battle results' whole percent as hundredths (0.64 for 64 %): a percent under 1 on a tank with a mark,
# or with a change no battle makes, is that percent (rounded to a whole one) and its change is dropped.
def _is_wrong_scale(entry):
    percent = entry.get('moe_percent')
    if not is_number(percent) or percent > WRONG_SCALE_PERCENT:
        return False
    delta = entry.get('moe_delta')
    has_mark = is_int(entry.get('marks_on_gun')) and entry['marks_on_gun'] > 0
    return has_mark or (is_number(delta) and abs(delta) > MAX_BATTLE_DELTA)


def _repaired(entry):
    if not _is_wrong_scale(entry):
        return entry
    fixed = dict(entry)
    fixed['moe_percent'] = round(entry['moe_percent'] * 100, 2)
    fixed['moe_delta'] = None
    return fixed


def restore_history(stored):
    if not isinstance(stored, list):
        return []
    return [_repaired(entry) for entry in stored if isinstance(entry, dict)]


def _idle_gap_between(later, earlier, idle_s):
    later_time = later.get('time')
    earlier_time = earlier.get('time')
    if not is_int(later_time) or not is_int(earlier_time):
        return False
    return later_time - earlier_time > idle_s


def session_of(entries, idle_s):
    run = []
    for entry in reversed(entries):
        if run and _idle_gap_between(run[-1], entry, idle_s):
            break
        run.append(entry)
    return list(reversed(run))


def _average(entries, key):
    values = [entry.get(key) for entry in entries if is_number(entry.get(key))]
    if not values:
        return None
    return float(sum(values)) / len(values)


def _win_rate(entries):
    if not entries:
        return 0.0
    wins = len([entry for entry in entries if entry.get('result') == 'win'])
    return 100.0 * wins / len(entries)


def session_row(entries, translate):
    net_credits = sum(entry.get('net_credits') or 0 for entry in entries)
    subtitle = translate(
        'br_session_line',
        winrate='%.1f%%' % _win_rate(entries),
        damage=format_number(_average(entries, 'damage')),
        assist=format_number(_average(entries, 'assist')),
        xp=format_number(_average(entries, 'xp')),
    )
    return {
        'id': SESSION_ROW,
        'title': translate('br_session_title', battles=len(entries)),
        'subtitle': subtitle,
        'meta': translate('br_session_credits', credits=format_number(net_credits)),
        'badge': None,
        'link': None,
        'details': [],
        'actions': [],
    }


def _numbers(entry, keys):
    return ' / '.join(format_number(entry.get(key)) for key in keys)


def _moe_text(entry):
    percent = entry.get('moe_percent')
    if percent is None:
        return None

    text = format_percent(percent)
    if entry.get('moe_delta') is not None:
        text += ' (%s)' % signed(entry['moe_delta'], True)

    return text


def _detail_values(entry):
    assist = format_number(entry.get('assist'))
    assist_parts = _numbers(entry, ('assist_radio', 'assist_track', 'assist_stun'))
    xp = format_number(entry.get('xp'))
    free_xp = format_number(entry.get('free_xp'))
    life = format_timer(entry.get('life_time'))
    duration = format_timer(entry.get('duration'))
    return (
        ('br_detail_damage', format_number(entry.get('damage'))),
        ('br_detail_assist', '%s (%s)' % (assist, assist_parts)),
        ('br_detail_blocked', format_number(entry.get('blocked'))),
        ('br_detail_frags_spotted', _numbers(entry, ('frags', 'spotted'))),
        ('br_detail_shots', _numbers(entry, ('shots', 'hits', 'pens'))),
        ('br_detail_xp', '%s (%s)' % (xp, free_xp)),
        ('br_detail_credits', format_number(entry.get('credits'))),
        ('br_detail_costs', _numbers(entry, COST_KEYS)),
        ('br_detail_net', format_number(entry.get('net_credits'))),
        ('br_detail_life', '%s / %s' % (life, duration)),
        ('br_detail_moe', _moe_text(entry)),
    )


def detail_rows(entry, translate):
    return [
        {'label': translate(label), 'value': value}
        for label, value in _detail_values(entry)
        if value is not None
    ]


def _battle_time(entry):
    if not is_int(entry.get('time')):
        return None
    return format_epoch(entry['time'])


def _moe_badge(entry):
    if entry.get('moe_delta') is None:
        return None
    return signed(entry['moe_delta'], True)


def battle_row(index, entry, translate):
    title = translate(
        'br_row_title',
        result=result_label(entry.get('result'), translate),
        vehicle=entry.get('vehicle') or '',
        map=entry.get('map') or '',
    )
    subtitle = translate(
        'br_row_line',
        damage=format_number(entry.get('damage')),
        assist=format_number(entry.get('assist')),
        frags=format_number(entry.get('frags')),
        xp=format_number(entry.get('xp')),
    )
    return {
        'id': str(entry.get('arena') or index),
        'title': title,
        'subtitle': subtitle,
        'meta': _battle_time(entry),
        'badge': _moe_badge(entry),
        'link': None,
        'details': detail_rows(entry, translate),
        'actions': [],
    }


def _newest_first(dated):
    return [row for _, row in sorted(dated, key=lambda pair: -pair[0] if is_number(pair[0]) else 0)]


def with_viewer(row, viewer_battles, translate):
    """`row` with the button that opens the hit viewer at its battle, when the viewer has that battle."""
    if row['id'] not in viewer_battles:
        return row
    action = {'id': ACTION_HITS, 'label': translate('br_open_hits'), 'confirm': None}
    return dict(row, actions=list(row['actions']) + [action])


def _battle_rows(entries, translate, hit_battles, show_attacker):
    unmatched = dict((battle['id'], battle) for battle in hit_battles)
    dated = []
    for index, entry in reversed(list(enumerate(entries))):
        row = battle_row(index, entry, translate)
        battle = unmatched.pop(row['id'], None)
        if battle is not None:
            row = with_hits(row, battle, translate, show_attacker)
        dated.append((entry.get('time'), row))

    hits_only = [battle for battle in reversed(hit_battles) if battle['id'] in unmatched]
    dated += [(battle.get('t'), hits_row(battle, translate, show_attacker)) for battle in hits_only]
    return _newest_first(dated)


# `hit_battles`: the recorded hits on the own tank (HitBook.battles, oldest first), shown when the hits tab is on;
# `viewer_battles`: the battle ids the hit viewer can open (core.events hit_viewer_battles).
def build_page(entries, translate, idle_s, hit_battles=(), show_attacker=True, viewer_battles=frozenset()):
    rows = []

    session = session_of(entries, idle_s)
    if session:
        rows.append(session_row(session, translate))

    battle_rows = _battle_rows(entries, translate, hit_battles, show_attacker)
    rows += [with_viewer(row, viewer_battles, translate) for row in battle_rows]
    return {'kind': 'list', 'empty': translate('br_empty'), 'rows': rows}


def page_actions(translate):
    return [
        {'id': 'site', 'label': translate('br_site'), 'link': SITE_BATTLES_PATH, 'confirm': None},
        {'id': ACTION_CLEAR, 'label': translate('br_clear'), 'confirm': translate('br_clear_confirm')},
    ]

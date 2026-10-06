from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import count_phrase, format_number, format_percent
from .constants import ACCOUNT_FACTS, FACT_SEPARATOR, METRIC_KEY, PERCENT_METRICS
from .ratings import rating_value

# The words of the card shared by the Gameface card (model/widget.py) and the text (model/text.py).


def pending_caption(pending, translate):
    if not pending:
        return None
    return count_phrase(pending, translate('session_pending'))


def goal_value(metric, value):
    if value is None:
        return u'-'
    if metric in PERCENT_METRICS:
        return format_percent(value)
    return format_number(value)


def goal_label(goal, translate, vehicle_name=None):
    target = goal_value(goal['metric'], goal['target'])
    label = translate('goal_metric_' + goal['metric'], target=target)
    if not goal.get('tank_id') or not vehicle_name:
        return label
    return translate('goal_on_tank', goal=label, vehicle=vehicle_name)


def goal_done_notice(goal, translate, vehicle_name=None):
    return translate('goals_done_notice', goal=goal_label(goal, translate, vehicle_name))


def metric_enabled(settings, metric):
    return bool(settings.get(METRIC_KEY % metric))


def account_wn8(overall, settings):
    if not metric_enabled(settings, 'wn8'):
        return None
    value = rating_value(overall.get('wn8'))
    return None if value is None else u'WN8 ' + value


def _win_rate_fact(overall, translate):
    value = overall.get('win_rate')
    return None if value is None else format_percent(value)


def _avg_damage_fact(overall, translate):
    value = overall.get('avg_damage')
    return None if value is None else format_number(value)


def _eff_fact(overall, translate):
    value = rating_value(overall.get('eff'))
    return None if value is None else u'%s %s' % (translate('session_account_eff'), value)


FACTS = {
    'win_rate': _win_rate_fact,
    'avg_damage': _avg_damage_fact,
    'eff': _eff_fact,
}


def account_facts(overall, settings, translate):
    facts = [FACTS[metric](overall, translate) for metric in ACCOUNT_FACTS if metric_enabled(settings, metric)]
    return FACT_SEPARATOR.join(fact for fact in facts if fact) or None

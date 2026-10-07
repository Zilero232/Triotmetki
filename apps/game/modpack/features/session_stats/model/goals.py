from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import fraction, is_int, string_types, to_text
from ....core.me import number, owned
from .constants import ACHIEVED, ACTIVE, GOAL_METRICS, MAX_GOALS, MAX_REMEMBERED, SHOWN_STATUSES


def _tank_id(value):
    if is_int(value) and value > 0:
        return int(value)
    return None


def parse_goal(item):
    if not isinstance(item, dict) or not isinstance(item.get('id'), string_types):
        return None
    metric = item.get('metric')
    status = item.get('status')
    target = number(item.get('target'))
    if metric not in GOAL_METRICS or status not in SHOWN_STATUSES or target is None:
        return None

    return {
        'id': to_text(item['id']),
        'metric': metric,
        'tank_id': _tank_id(item.get('tank_id')),
        'target': target,
        'baseline': number(item.get('baseline')) or 0.0,
        'current': number(item.get('current')),
        'status': status,
    }


def parse_goals(data, account_id):
    if not owned(data, account_id) or not isinstance(data.get('goals'), list):
        return []
    goals = [parse_goal(item) for item in data['goals'][:MAX_GOALS]]
    return [goal for goal in goals if goal is not None]


def is_done(goal):
    if goal['status'] == ACHIEVED:
        return True
    current = goal.get('current')
    if goal['status'] != ACTIVE or current is None:
        return False
    return current >= goal['target']


def progress(goal):
    current = goal.get('current')
    if current is None:
        return None
    if is_done(goal):
        return 1.0

    span = goal['target'] - goal['baseline']
    if span <= 0:
        return 0.0
    share = (current - goal['baseline']) / span
    return fraction(share)


def _remembered_ids(data):
    if not isinstance(data, list):
        return []
    return [to_text(item) for item in data if isinstance(item, string_types)]


class Announced(object):

    def __init__(self, data=None):
        self.ids = _remembered_ids(data)
        self.primed = bool(self.ids)

    def newly_done(self, goals):
        fresh = [goal for goal in goals if is_done(goal) and goal['id'] not in self.ids]
        self.ids.extend(goal['id'] for goal in fresh)
        del self.ids[:-MAX_REMEMBERED]

        was_primed = self.primed
        self.primed = True
        if not was_primed:
            return []
        return fresh

    def to_list(self):
        return list(self.ids)

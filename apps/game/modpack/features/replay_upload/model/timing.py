from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import is_number


def battle_started_at(seen_at, results, to_local):
    if seen_at is not None:
        return seen_at

    common = results.get('common') if isinstance(results, dict) else None
    if not isinstance(common, dict):
        return None
    created = common.get('arenaCreateTime')
    if not is_number(created) or created <= 0:
        return None

    local = to_local(created)
    if not is_number(local) or local <= 0:
        return None
    return float(local)

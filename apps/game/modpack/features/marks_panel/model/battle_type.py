from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import MARKS_BONUS_TYPES, MARKS_CAP


# RU 1.45 common/arena_bonus_type_caps.py: checkAny takes the cap's value, not its name.
def _cap_says_marks(bonus_caps, bonus_type):
    cap = getattr(bonus_caps, MARKS_CAP, None)
    if cap is None:
        return False

    return bool(bonus_caps.checkAny(bonus_type, cap))


def counts_marks(bonus_caps, bonus_type, marks_types=MARKS_BONUS_TYPES):
    if bonus_caps is None or bonus_type in marks_types:
        return True

    return _cap_says_marks(bonus_caps, bonus_type)

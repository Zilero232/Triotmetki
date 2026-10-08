from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import MARKS_CAP


# RU 1.45 common/arena_bonus_type_caps.py: a battle moves the marks on gun only with DOSSIER_MARKS_ON_GUN.
def counts_marks(bonus_caps, bonus_type):
    if bonus_caps is None:
        return True
    return bool(bonus_caps.checkAny(bonus_type, MARKS_CAP))

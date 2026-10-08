from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.features.marks_panel.model.battle_type import counts_marks

RANDOM = 1
TRAINING = 2
MAPBOX = 46
MARKS_CAP_VALUE = 17


class BonusCaps(object):
    DOSSIER_MARKS_ON_GUN = MARKS_CAP_VALUE

    @staticmethod
    def checkAny(bonus_type, *caps):
        return bonus_type == MAPBOX and MARKS_CAP_VALUE in caps


class RefusingCaps(object):
    DOSSIER_MARKS_ON_GUN = MARKS_CAP_VALUE

    @staticmethod
    def checkAny(bonus_type, *caps):
        return False


class CountsMarksTest(unittest.TestCase):

    def test_a_random_battle_counts_marks(self):
        assert counts_marks(BonusCaps, RANDOM)

    def test_a_random_battle_counts_marks_even_when_the_caps_refuse(self):
        assert counts_marks(RefusingCaps, RANDOM)

    def test_another_battle_type_asks_the_caps_by_the_caps_value(self):
        assert counts_marks(BonusCaps, MAPBOX)

    def test_a_training_battle_counts_no_marks(self):
        assert not counts_marks(BonusCaps, TRAINING)

    def test_a_client_without_the_caps_keeps_the_panel(self):
        assert counts_marks(None, TRAINING)


if __name__ == '__main__':
    unittest.main()

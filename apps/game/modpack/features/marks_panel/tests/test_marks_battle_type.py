from __future__ import absolute_import, division, print_function, unicode_literals

import unittest

import _support  # noqa: F401
from otmetki.features.marks_panel.model.battle_type import counts_marks

RANDOM = 1
TRAINING = 2


class BonusCaps(object):

    @staticmethod
    def checkAny(bonus_type, *caps):
        return bonus_type == RANDOM and 'DOSSIER_MARKS_ON_GUN' in caps


class CountsMarksTest(unittest.TestCase):

    def test_a_random_battle_counts_marks(self):
        assert counts_marks(BonusCaps, RANDOM)

    def test_a_training_battle_counts_no_marks(self):
        assert not counts_marks(BonusCaps, TRAINING)

    def test_a_client_without_the_caps_keeps_the_panel(self):
        assert counts_marks(None, TRAINING)


if __name__ == '__main__':
    unittest.main()

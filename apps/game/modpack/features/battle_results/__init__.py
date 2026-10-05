from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'battle_results'
PACKAGE_ID = 'net.triotmetki.battle_results'
PACKAGE_NAME = 'Three Marks: battle results'
VERSION = '0.3.2'


def create(app):
    from .client import BattleResultsSummary
    return BattleResultsSummary(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)

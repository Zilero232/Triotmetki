from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'battle_progress'
PACKAGE_ID = 'net.triotmetki.battle_progress'
PACKAGE_NAME = 'Three Marks: battle progress'
VERSION = '0.2.0'


def create(app):
    from .client import BattleProgressPanel
    return BattleProgressPanel(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)

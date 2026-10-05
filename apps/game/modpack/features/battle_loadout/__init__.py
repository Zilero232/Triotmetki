from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'battle_loadout'
PACKAGE_ID = 'net.triotmetki.battle_loadout'
PACKAGE_NAME = 'Three Marks: battle loadout'
VERSION = '0.7.0'


def create(app):
    from .client import BattleLoadoutPanel
    return BattleLoadoutPanel(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)

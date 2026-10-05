from __future__ import absolute_import, division, print_function, unicode_literals

FEATURE_ID = 'battle_hotkeys'
PACKAGE_ID = 'net.triotmetki.battle_hotkeys'
PACKAGE_NAME = 'Three Marks: battle hotkeys'
VERSION = '0.1.1'


def create(app):
    from .client import BattleHotkeys
    return BattleHotkeys(app)


def register():
    from ...core.registry import registry
    return registry().register(FEATURE_ID, create)

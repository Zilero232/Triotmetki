"""The battle type of the arena the player is in, for the HUD layout per battle type (`core.hud.modes`).

RU 1.45 client source: client_common/ClientArena.py keeps `guiType` (ARENA_GUI_TYPE) and `bonusType` (ARENA_BONUS_TYPE)
on `BigWorld.player().arena`; the battle page is a View whose `alias` is its VIEW_ALIAS (classicBattlePage,
comp7BattlePage, epicBattlePage, ...), read only when the arena says nothing.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ....compat import string_types
from ....hud.modes import battle_mode


def page_alias(page):
    try:
        alias = getattr(page, 'alias', None)
    except Exception:
        return None
    return alias if isinstance(alias, string_types) else None


def arena_types():
    try:
        import BigWorld
        arena = getattr(BigWorld.player(), 'arena', None)
    except Exception:
        return None, None
    return getattr(arena, 'guiType', None), getattr(arena, 'bonusType', None)


def current_mode(page=None):
    gui_type, bonus_type = arena_types()
    return battle_mode(gui_type, bonus_type, page_alias(page))


def mode_details(page=None):
    """What the battle type was read from, for the log: the arena's gui and bonus types and the battle page alias."""
    gui_type, bonus_type = arena_types()
    return 'gui type %s, bonus type %s, page %s' % (gui_type, bonus_type, page_alias(page) or '-')

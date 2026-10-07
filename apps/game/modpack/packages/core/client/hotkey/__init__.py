from __future__ import absolute_import, division, print_function, unicode_literals

from ...hooks import subscribe, unsubscribe
from ...log import safe
from .constants import EITHER_SIDE


def _held(big_world, keys, name):
    for side in (name, EITHER_SIDE.get(name)):
        code = getattr(keys, side, None) if side else None
        if code is not None and big_world.isKeyDown(code):
            return True
    return False


def _repeated(event):
    # RU 1.45 BigWorld.KeyEvent.isRepeatedEvent(): a held key sends onKeyDown again; a toggle would flicker.
    check = getattr(event, 'isRepeatedEvent', None)
    return bool(check()) if check is not None else False


def _chat_focused():
    # XVM's check (RU 1.45 messenger/MessengerEntry.py): a key typed into the battle chat is text, not a hotkey.
    try:
        from messenger import MessengerEntry
        return bool(MessengerEntry.g_instance.gui.isFocused())
    except Exception:
        return False


class Hotkey(object):
    """Calls `on_press()` when the key named `key` (a `Keys` name, KEY_T) goes down while every key of `modifiers`
    is held (a left-hand Ctrl, Shift or Alt also on the right) and the battle chat has no focus, through the game's
    own InputHandler.onKeyDown (hangar and battle). A held key's auto-repeat does not press it again. `install()` /
    `remove()` are idempotent."""

    def __init__(self, key, modifiers, on_press):
        self.key = key
        self.modifiers = tuple(modifiers or ())
        self.on_press = on_press
        self.handler = None

    @safe
    def install(self):
        if self.handler is not None:
            return True
        from gui import InputHandler
        self.handler = subscribe(InputHandler.g_instance, 'onKeyDown', self._on_key_down)
        return True

    @safe
    def remove(self):
        if self.handler is not None:
            from gui import InputHandler
            unsubscribe(InputHandler.g_instance, 'onKeyDown', self.handler)
            self.handler = None

    def _on_key_down(self, event):
        import BigWorld
        import Keys
        if not self._is_first_press(event, Keys) or _chat_focused():
            return
        if all(_held(BigWorld, Keys, name) for name in self.modifiers):
            self.on_press()

    def _is_first_press(self, event, keys):
        if not self.key or _repeated(event):
            return False
        return getattr(event, 'key', None) == getattr(keys, self.key, None)


class HotkeyChoice(object):
    """The hotkey a player picks from `hotkeys` ({choice: (Keys name or None, modifiers)}): `set(choice)` installs its
    key in place of the previous one and returns whether one is installed; a choice without a key (or an unknown one)
    only removes it."""

    def __init__(self, hotkeys, on_press):
        self.hotkeys = hotkeys
        self.on_press = on_press
        self.hotkey = None

    def set(self, choice):
        self.remove()
        key, modifiers = self.hotkeys.get(choice) or (None, ())
        if key is None:
            return False
        self.hotkey = Hotkey(key, modifiers, self.on_press)
        self.hotkey.install()
        return True

    def remove(self):
        if self.hotkey is not None:
            self.hotkey.remove()
            self.hotkey = None

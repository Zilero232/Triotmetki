"""Hooks into the game client: client events and method overrides. Every handler runs guarded: an
exception is logged and never reaches the client's own code."""
from __future__ import absolute_import, division, print_function, unicode_literals

from ..log import log_exception, safe
from .constants import RESTORE_ATTR


def subscribe(owner, name, handler):
    """`owner.name += handler` for a client `Event`, spelt as a call so it can be undone with `unsubscribe`.
    Returns the guarded handler that was subscribed: pass that one to `unsubscribe`."""
    guarded = safe(handler)
    event = getattr(owner, name)
    event += guarded
    setattr(owner, name, event)
    return guarded


def unsubscribe(owner, name, handler):
    event = getattr(owner, name, None)
    if event is None:
        return False
    try:
        event -= handler
    except Exception:
        return False
    setattr(owner, name, event)
    return True


class Subscriptions(object):
    """Remembers every `subscribe` so `clear()` removes them all (a feature stopping, the mod unloading)."""

    def __init__(self):
        self.items = []

    def add(self, owner, name, handler):
        guarded = subscribe(owner, name, handler)
        self.items.append((owner, name, guarded))
        return guarded

    def clear(self):
        while self.items:
            owner, name, handler = self.items.pop()
            unsubscribe(owner, name, handler)


class OriginalCall(object):

    def __init__(self, original):
        self.original = original
        self.returned = False
        self.raised = False
        self.result = None

    def __call__(self, *args, **kwargs):
        try:
            self.result = self.original(*args, **kwargs)
        except Exception:
            self.raised = True
            raise
        self.returned = True
        return self.result


def _own_value(owner, name):
    namespace = getattr(owner, '__dict__', {})
    if name in namespace:
        return True, namespace[name]
    for klass in getattr(owner, '__mro__', ())[1:]:
        if name in klass.__dict__:
            return False, klass.__dict__[name]
    return False, getattr(owner, name)


def override(owner, name):
    """Replace `owner.name` with a wrapper that calls `handler(original, *args, **kwargs)`.

    Works for module functions and for class methods (the wrapper receives `self` as the first argument
    after `original`). A handler that raises is logged; the client then gets the original's result, or
    the original is called for it when the handler failed before calling it. An exception raised by the
    original itself propagates as it would without the mod. `restore(owner, name)` puts the original back.
    """
    def decorator(handler):
        had_own, raw = _own_value(owner, name)
        if isinstance(raw, property):
            raise TypeError('override() does not wrap properties: %s' % name)

        wrapper = _guarded(getattr(owner, name), handler, name)
        setattr(wrapper, RESTORE_ATTR, (had_own, raw))
        if isinstance(raw, (staticmethod, classmethod)):
            setattr(owner, name, staticmethod(wrapper))
        else:
            setattr(owner, name, wrapper)
        return handler
    return decorator


def _guarded(original, handler, name):
    def wrapper(*args, **kwargs):
        call = OriginalCall(original)
        try:
            return handler(call, *args, **kwargs)
        except Exception:
            if call.raised:
                raise
            log_exception('override %s' % name)
            return call.result if call.returned else original(*args, **kwargs)

    wrapper.__name__ = getattr(handler, '__name__', str(name))
    return wrapper


def _saved_original(owner, name):
    had_own, current = _own_value(owner, name)
    if isinstance(current, staticmethod):
        current = current.__get__(None, owner)
    return getattr(current, RESTORE_ATTR, None) if had_own else None


def is_restorable(owner, name):
    """True while `owner.name` is still the wrapper `override` put there: no other mod wrapped it since, so
    `restore` can put the original back."""
    return _saved_original(owner, name) is not None


def restore(owner, name):
    saved = _saved_original(owner, name)
    if saved is None:
        return False
    was_own, raw = saved
    if was_own:
        setattr(owner, name, raw)
    else:
        delattr(owner, name)
    return True

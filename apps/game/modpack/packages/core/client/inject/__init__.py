"""A Gameface page inside a Scaleform view, the way the client injects its own.

Design: docs/specs/2026-10-06-gameface-inject-host.md.

RU 1.45 client source: gui/Scaleform/framework/entities/inject_component_adaptor.py and, in AS3, gui_base
`GFInjectComponent` -> `InjectComponent` -> wulf `ChildViewProxy`. The client's own pages (the hangar crew panel, the
battle context hints) place a `GFInjectComponent` in their SWF; the adaptor registered for it adds a Gameface
`ViewImpl` as a child of the main window's view and hands its id to the proxy (`as_setPlaceId`), which draws the
page's texture inside the Scaleform view and hit-tests it by its rectangle (`ViewWrapper.hitArea`).

`InjectHost` ships no SWF: it creates the stock `GFInjectComponent` through the app's own ClassFactory, adds it to a
Scaleform view's display list and registers it with that view as if the SWF had (`registerFlashComponent`). The
component lives as long as the parent view, so a page in the hangar view goes away with the hangar.
UNVERIFIED on Lesta 1.45: that the Python GFx bridge passes the created object back into AS3 calls (`addChild`) and that
a component registered from Python populates like one registered from AS3; every step logs.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...compat import to_native
from ...inject import GF_INJECT_CLASS
from ...log import log, log_exception, safe
from .page import bind, page_layout, page_usable

__all__ = ('InjectHost', 'page_layout', 'page_usable')


def _class_factory(app):
    root = getattr(app, 'flashObject', None)
    utils = getattr(root, 'utils', None) if root is not None else None
    return getattr(utils, 'classFactory', None) if utils is not None else None


def new_inject_component(app):
    """A new stock GFInjectComponent made by `app`'s AS3 ClassFactory (base_app ClassFactory.getObject), or None."""
    factory = _class_factory(app)
    if factory is None:
        log('inject: the app %r has no AS3 ClassFactory' % (app,))
        return None
    return factory.getObject(to_native(GF_INJECT_CLASS))


class InjectHost(object):
    """One Gameface page (`layout_key`: an OpenWG Gameface res_map item id) inside a Scaleform view.

    `attach(parent_view)` puts the page into a loaded Scaleform view (gui.Scaleform View: the hangar view;
    again for the same view does nothing, for another view moves it there), `detach()` takes it out. `owner` hears
    `on_page(view)` once the page loaded, `on_message(raw)` for every message the page sends and `on_gone()` when the
    page went away (detached, or the parent view destroyed). `push(text)` sets the page's state string,
    `set_mouse(enabled)` lets the mouse reach the page or pass through it to the view below and `move(x, y)` places it
    in the parent view's coordinates."""

    def __init__(self, alias, layout_key, owner):
        self.alias = alias
        self.layout_key = layout_key
        self.owner = owner
        self.layout = None
        self.parent = None
        self.component = None
        self.view = None

    def attached(self):
        return self.parent is not None

    @safe
    def attach(self, parent_view):
        if self.parent is parent_view:
            return True
        if self.parent is not None:
            self.detach()
        self.layout = page_layout(self.layout_key)
        if self.layout is None:
            log('inject %s: no layout for %s yet (res_map not validated?)' % (self.alias, self.layout_key))
            return False
        if not bind(self.alias, self):
            return False
        component = new_inject_component(parent_view.app)
        if component is None:
            return False
        return self._place(parent_view, component)

    def _place(self, parent_view, component):
        self.parent = parent_view
        self.component = component
        try:
            parent_view.flashObject.addChild(component)
            parent_view.registerFlashComponent(component, self.alias)
        except Exception:
            log_exception('inject %s: placing the GFInjectComponent' % self.alias)
            self.detach()
            return False
        log('inject %s: GFInjectComponent placed in %s (layout %s)' % (self.alias, parent_view.alias, self.layout))
        return True

    @safe
    def detach(self):
        parent, component = self.parent, self.component
        if parent is None:
            return
        try:
            if parent.isFlashComponentRegistered(self.alias):
                parent.unregisterFlashComponent(self.alias)
            parent.flashObject.removeChild(component)
        except Exception:
            log_exception('inject %s: removing the GFInjectComponent' % self.alias)
        self._gone()

    @safe
    def push(self, text):
        if self.view is not None:
            self.view.viewModel.set_state(text)

    @safe
    def set_mouse(self, enabled):
        if self.component is not None:
            self.component.mouseEnabled = bool(enabled)
            self.component.mouseChildren = bool(enabled)

    @safe
    def move(self, x, y):
        if self.component is not None:
            self.component.x = x
            self.component.y = y

    @safe
    def on_view_loaded(self, view):
        self.view = view
        log('inject %s: page loaded' % self.alias)
        self.owner.on_page(view)

    @safe
    def on_view_destroyed(self, view):
        if self.view is view:
            self.view = None
            log('inject %s: page destroyed' % self.alias)

    @safe
    def on_message(self, raw):
        self.owner.on_message(raw)

    @safe
    def on_adaptor_disposed(self, adaptor):
        log('inject %s: adaptor disposed with its parent view' % self.alias)
        self._gone()

    def _gone(self):
        was_attached = self.parent is not None
        self._forget()
        if was_attached:
            self.owner.on_gone()

    def _forget(self):
        self.parent = None
        self.component = None
        self.view = None

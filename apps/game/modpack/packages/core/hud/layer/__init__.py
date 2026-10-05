"""What features call: register a panel with its schema, show text in it, hide it.

When the backend reports a drag or a resize (`on_moved`), the new x/y (and the anchor, when the renderer sends one) or
scale are saved into the panel's section of components.json, so the panel comes back where the player left it. An
unchanged text is not sent again (a Flash or Gameface re-layout per call is the cost).

`set_muted(True)` (the streamer hotkey) and `set_blocked(panel_ids)` (the streamer's private panels) take panels off
the screen without the features knowing: their texts are held and come back when the panel is allowed again.
`set_cover(reason, on)` is the one rule for what covers the battle view (`constants.COVER_EFFECTS`): V, the killer
camera and the loading screen make the shown panels invisible, Tab gives them the `cover` prop `stats` and a modal stock
view (the Esc menu) `modal`: the page fades them and they take no mouse and show no tooltip. The page keeps every panel
drawn where it was, so nothing moves when they come back. `set_gui_hidden`, `set_full_stats` and `set_menu` are its V,
Tab and Esc reasons.

`set_stock_hidden(aliases)` follows the stock components the page has off the screen now (`core.hud.cover`
FollowedComponents): a panel that goes with one (`panel.FOLLOWS`, the equipment row with the consumables panel) is made
invisible like a covered one, and an attached panel (`panel.ATTACHED`) measures a hidden component as 0 px
(`stock.followed_metrics`), so nothing keeps a place beside what is gone.

`enter_mode(mode)` (a battle type, `core.hud.modes`) asks the layout policy a component set with `set_policy(policy)`
which panels the type shows and whether it keeps places of its own: a panel the type leaves out is held like a muted
one, and a drag in such a battle is saved for that type (`ModePlaces`), not in the panel's settings. `leave_mode()` goes
back to every panel at its own place (the hangar, the HUD editor).

`show(panel_id, text, widget)` also carries the panel's structured payload (`core.hud.widget`) for the Gameface page;
`renders_widgets()` says whether the renderer draws it (a feature replaces a stock element only then); `draws(panel_id)`
whether the renderer confirmed the panel on the screen (the Gameface page reports the panels it laid out with a size).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...compat import is_number, string_types
from ..backend import NullBackend
from ..modes import MODE_RANDOM, ModePlaces
from ..panel import (
    ATTACHED,
    FOLLOWS,
    LAYOUT_KEYS,
    fit_place,
    alias_of,
    attach_of,
    dock_of,
    is_pinned,
    layout_props,
    moved_values,
    panel_hint,
    panel_of,
    pinned_values,
    retired_reset,
)
from ..stock import FOLLOWED_ALIASES, followed_metrics, stock_metrics
from .constants import (
    COVER_EFFECTS,
    COVER_FADES,
    COVER_FULL_STATS,
    COVER_GUI,
    COVER_HIDE,
    COVER_MENU,
    COVER_NONE,
    COVER_RELEASES_STOCK,
)


class HudLayer(object):

    def __init__(self, backend, config, translate=None):
        self.backend = backend or NullBackend()
        self.config = config
        self.translate = translate
        self.panels = {}
        self.schemas = {}
        self.shown = set()
        self.texts = {}
        self.widgets = {}
        self.places = {}
        self.muted = False
        self.covers = frozenset()
        self.blocked = frozenset()
        self.held = {}
        self.mode = None
        self.allowed = None
        self.own_places = False
        self.policy = None
        self.mode_places = ModePlaces(config)
        self.watchers = []
        self.metrics = stock_metrics()
        self.stock_hidden = frozenset()
        self.backend.listen(self.on_moved)
        self.backend.listen_drawn(self._notify)

    @property
    def gui_hidden(self):
        return self._covered(COVER_HIDE)

    @property
    def full_stats(self):
        return COVER_FULL_STATS in self.covers

    @property
    def menu(self):
        return COVER_MENU in self.covers

    @property
    def cover(self):
        """The page's `cover` prop of the shown panels: the strongest fade a covering view asks for, or ''."""
        for effect in COVER_FADES:
            if self._covered(effect):
                return effect
        return COVER_NONE

    def _covered(self, effect):
        return any(COVER_EFFECTS.get(reason) == effect for reason in self.covers)

    @property
    def has_panels(self):
        return bool(self.backend.available())

    @property
    def backend_name(self):
        return self.backend.name

    def register(self, panel_id, schema):
        """Declare a panel; returns its settings (a `Settings` over `schema`, stored in components.json). A panel still
        at a default place of an older version moves to today's default (`panel.retired_reset`)."""
        settings = self.config.section(panel_id, schema)
        reset = retired_reset(settings) or fit_place(settings)
        if reset:
            self.config.update(panel_id, reset)
        self.panels[panel_id] = settings
        self.schemas[panel_id] = schema
        return settings

    def settings(self, panel_id):
        return self.panels.get(panel_id)

    def is_registered(self, panel_id):
        return panel_id in self.panels

    def place_values(self, panel_id):
        """The layout keys of a panel in the current battle type: its settings with the type's own place over them; a
        pinned panel always sits at its default place."""
        settings = self.panels[panel_id]
        values = dict((key, settings.get(key)) for key in LAYOUT_KEYS)
        if self.own_places:
            values.update(self.mode_places.get(self.mode, panel_id))
        return pinned_values(settings, values)

    def layout(self, panel_id):
        values = self.place_values(panel_id)
        props = layout_props(values)
        props['dock'] = dock_of(alias_of(panel_id), values)
        props['attach'] = self._attach(panel_id, values)
        return props

    def _attach(self, panel_id, values):
        metrics = followed_metrics(self.metrics, self.stock_hidden)
        return attach_of(alias_of(panel_id), values, self.panels[panel_id].schema.defaults, metrics)

    def set_stock_metrics(self, metrics):
        """The measured stock sizes (core.hud.stock.stock_metrics) the attached panels follow; a shown attached panel
        is placed again when they changed."""
        if not metrics or metrics == self.metrics:
            return False
        self._restage(lambda: setattr(self, 'metrics', dict(metrics)))
        return True

    def set_stock_hidden(self, aliases):
        """The followed stock components (core.hud.stock.FOLLOWED_ALIASES) the page has off the screen now: the panels
        that go with one hide or come back, the attached ones are placed again; only the props that changed are sent."""
        hidden = frozenset(alias for alias in (aliases or ()) if alias in FOLLOWED_ALIASES)
        if hidden == self.stock_hidden:
            return False
        self._restage(lambda: setattr(self, 'stock_hidden', hidden))
        return True

    def _restage(self, change):
        before = dict((alias, self._stage_props(alias)) for alias in self.shown)
        change()
        for alias in sorted(self.shown):
            after = self._stage_props(alias)
            changed = dict((key, value) for key, value in after.items() if before[alias].get(key) != value)
            if changed:
                self.backend.update(alias, changed)

    def _stage_props(self, alias):
        props = {'visible': self._visible(alias)}
        panel_id = panel_of(alias)
        if alias in ATTACHED and panel_id in self.panels:
            props['attach'] = self._attach(panel_id, self.place_values(panel_id))
        return props

    def _visible(self, alias):
        return not self.gui_hidden and FOLLOWS.get(alias) not in self.stock_hidden

    def props(self, panel_id, text, widget=None):
        props = self.layout(panel_id)
        visible = self._visible(alias_of(panel_id))
        props.update({'text': text, 'visible': visible, 'widget': widget, 'cover': self.cover})
        props['hint'] = panel_hint(self.translate, alias_of(panel_id))
        return props

    def allows(self, panel_id):
        """Whether the current battle type shows this panel (every panel outside a battle type)."""
        return self.allowed is None or panel_id in self.allowed

    def draws(self, panel_id):
        """Whether the renderer confirmed the panel on the screen (the Gameface page laid it out with a size)."""
        drawn = self.backend.drawn_aliases()
        return drawn is not None and alias_of(panel_id) in drawn

    def page_draws(self):
        """Whether the renderer confirms what it draws at all (the Gameface page is up and reported)."""
        return self.backend.drawn_aliases() is not None

    def watch(self, callback):
        """`callback()` after every change of what keeps panels off the screen: mute, blocked panels, the battle type,
        a cover reason, the panels the renderer confirmed drawn."""
        if callback not in self.watchers:
            self.watchers.append(callback)

    def _notify(self):
        for callback in list(self.watchers):
            callback()

    def releases_stock(self, panel_id):
        """Whether the stock elements this panel replaces must come back: the panel is off the screen for a reason the
        stock HUD does not share (muted, blocked, left out of the battle type, `COVER_RELEASES_STOCK`)."""
        return self.suppressed(panel_id) or bool(self.covers & frozenset(COVER_RELEASES_STOCK))

    def suppressed(self, panel_id):
        return self.muted or panel_id in self.blocked or not self.allows(panel_id)

    def set_policy(self, policy):
        """`policy(mode)` -> (the panel ids the battle type shows or None for all, whether it keeps places of its own);
        None drops it (every panel, the panels' own places)."""
        self.policy = policy
        self._apply_mode()

    def enter_mode(self, mode):
        """Switch the panels to the layout of a battle type (again for the same type is a no-op); returns the type."""
        if mode != self.mode:
            self.mode = mode
            self._apply_mode()
        return mode

    def leave_mode(self):
        if self.mode is not None:
            self.mode = None
            self._apply_mode()

    def _mode_policy(self):
        if self.mode is None or self.policy is None:
            return None, False
        return self.policy(self.mode)

    def _apply_mode(self):
        allowed, own_places = self._mode_policy()
        self.allowed = frozenset(allowed) if allowed is not None else None
        self.own_places = bool(own_places) and self.mode not in (None, MODE_RANDOM)

        for alias in list(self.shown):
            panel_id = panel_of(alias)
            if panel_id in self.panels:
                self.places.pop(alias, None)
                self.backend.update(alias, self.layout(panel_id))
        self._apply()

    def renders_widgets(self):
        """Whether the renderer in use draws the widget payloads (the Gameface page, once it answered)."""
        return bool(self.backend.renders_widgets())

    def show(self, panel_id, text, widget=None):
        """Show or update the panel; False when it is unknown or no renderer is installed. A muted or blocked panel
        keeps its text for later and counts as shown."""
        if not self.is_registered(panel_id) or not self.has_panels:
            self.hide(panel_id)
            return False
        if self.suppressed(panel_id):
            self._take_off(panel_id)
            self.held[panel_id] = (text, widget)
            return True

        alias = alias_of(panel_id)
        if alias in self.shown:
            self._redraw(alias, text, widget)
            return True
        if not self.backend.create(alias, self.props(panel_id, text, widget)):
            return False
        self.shown.add(alias)
        self.texts[alias] = text
        self.widgets[alias] = widget
        return True

    def _redraw(self, alias, text, widget):
        if self.texts.get(alias) == text and self.widgets.get(alias) == widget:
            return
        self.backend.update(alias, {'text': text, 'visible': self._visible(alias), 'widget': widget})
        self.texts[alias] = text
        self.widgets[alias] = widget

    def place(self, panel_id, x, y):
        """Move a shown panel for now (a mark that follows the crosshair); components.json keeps the player's
        own position. False when the panel is not shown."""
        alias = alias_of(panel_id)
        if alias not in self.shown or not is_number(x) or not is_number(y):
            return False
        position = (int(round(x)), int(round(y)))
        if self.places.get(alias) != position:
            self.backend.update(alias, {'x': position[0], 'y': position[1]})
            self.places[alias] = position
        return True

    def hide(self, panel_id):
        self.held.pop(panel_id, None)
        self._take_off(panel_id)

    def _take_off(self, panel_id):
        alias = alias_of(panel_id)
        self.texts.pop(alias, None)
        self.widgets.pop(alias, None)
        self.places.pop(alias, None)
        if alias in self.shown:
            self.shown.discard(alias)
            self.backend.delete(alias)

    def set_muted(self, muted):
        """Take every panel off the screen (True) or bring back what the features show (False)."""
        self.muted = bool(muted)
        self._apply()

    def set_blocked(self, panel_ids):
        self.blocked = frozenset(panel_ids or ())
        self._apply()

    def set_cover(self, reason, on):
        """A view covers the battle (True) or went (False): the shown panels stay in place, hidden or dimmed as
        `COVER_EFFECTS` says; only the props that changed are sent."""
        if reason not in COVER_EFFECTS:
            return False
        covers = self.covers
        before = dict((alias, self._cover_props(alias)) for alias in self.shown)
        self.covers = self.covers | {reason} if on else self.covers - {reason}
        changed = False
        for alias in sorted(self.shown):
            after = self._cover_props(alias)
            props = dict((key, value) for key, value in after.items() if before[alias][key] != value)
            if props:
                self.backend.update(alias, props)
                changed = True
        if self.covers != covers:
            self._notify()
        return changed

    def _cover_props(self, alias):
        return {'visible': self._visible(alias), 'cover': self.cover}

    def set_gui_hidden(self, hidden):
        """Follow the stock battle GUI hidden with V (True) and shown again (False); the panels stay in place."""
        self.set_cover(COVER_GUI, bool(hidden))

    def set_full_stats(self, shown):
        """Follow the full stats held open with Tab: the panels stay, faded where the full stats lie (True), or not."""
        self.set_cover(COVER_FULL_STATS, bool(shown))

    def set_menu(self, shown):
        """Follow a modal stock view over the battle (the Esc menu): every panel stays, faded (True), or not."""
        self.set_cover(COVER_MENU, bool(shown))

    def _apply(self):
        for alias in list(self.shown):
            panel_id = panel_of(alias)
            if panel_id is not None and self.suppressed(panel_id):
                self.held[panel_id] = (self.texts.get(alias), self.widgets.get(alias))
                self._take_off(panel_id)
        for panel_id, (text, widget) in list(self.held.items()):
            if not self.suppressed(panel_id):
                del self.held[panel_id]
                if text is not None:
                    self.show(panel_id, text, widget)
        self._notify()

    def update_settings(self, panel_id, values):
        """Apply new settings (a settings window, a preset); a shown panel is moved or restyled at once."""
        changed = self.config.update(panel_id, values)
        alias = alias_of(panel_id)
        if changed and alias in self.shown and set(changed) & (set(LAYOUT_KEYS) | {'pinned'}):
            self.places.pop(alias, None)
            self.backend.update(alias, self.layout(panel_id))
        return changed

    def on_moved(self, alias, props):
        if not isinstance(alias, string_types) or not isinstance(props, dict):
            return False
        panel_id = panel_of(alias)
        if panel_id not in self.panels or is_pinned(self.panels[panel_id]):
            return False
        if self.own_places:
            changed = bool(self.mode_places.save(self.mode, panel_id, moved_values(props)))
        else:
            changed = bool(self.config.update(panel_id, moved_values(props)))
        if changed and alias in self.shown:
            values = self.place_values(panel_id)
            self.backend.update(alias, {'dock': dock_of(alias, values), 'attach': self._attach(panel_id, values)})
        return changed

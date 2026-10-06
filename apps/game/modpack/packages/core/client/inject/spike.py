"""The dev-only inject spikes: hud.html drawn inside the Scaleform hangar view and inside the battle page, each with one
label (spec, sections "Spike" and "Battle spike").

They start only in a dev install with OTMETKI_INJECT_SPIKE=1 or the flag file (core.inject.spike_enabled). A label
shows the input mode and a clock (the state path), the page's messages are logged (the command path), and Ctrl+Alt+I
cycles the input modes of the page that is on the screen: `view` (the page takes the mouse only over its buttons, none
here), `edit` (the page takes its whole area, the label can be dragged), `locked` (edit, but the GFInjectComponent lets
no mouse through to the page). The battle page sits below the loading screen, the Tab statistics and the radial menu,
and hides with the page (V).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import datetime
import os

from ...hud.surface import SPACE_BATTLE, SPACE_LOBBY, HudSurface
from ...inject import SpikeMode, spike_enabled, spike_text
from ...inject.constants import (
    BATTLE_APP,
    BATTLE_COVERS,
    BATTLE_PAGES,
    BATTLE_SPIKE_ALIAS,
    BATTLE_SPIKE_LABEL,
    BATTLE_SPIKE_LABEL_PROPS,
    BATTLE_SPIKE_TEXT,
    LOBBY_APP,
    SPIKE_ALIAS,
    SPIKE_FLAG,
    SPIKE_HOTKEY,
    SPIKE_LABEL,
    SPIKE_LABEL_PROPS,
    SPIKE_PAGE,
    SPIKE_TEXT,
    SPIKE_TICK_S,
)
from ...lobby_view import HANGAR_ALIAS
from ...log import log, safe
from ...vendor import attr
from ..game import battle_app, lobby_app
from ..hotkey import Hotkey
from ..timer import Ticker
from . import InjectHost
from .watch import ViewWatch

_started = []


@attr.s(frozen=True)
class SpikePlace(object):
    """Where a spike goes: the app (`namespace`, `get_app`), its views (`aliases`), the page's GUI space, the label and
    the children of the view the page goes under (`covers`)."""

    alias = attr.ib()
    namespace = attr.ib()
    aliases = attr.ib()
    get_app = attr.ib()
    space = attr.ib()
    label = attr.ib()
    props = attr.ib()
    template = attr.ib()
    covers = attr.ib(default=())


HANGAR = SpikePlace(
    SPIKE_ALIAS, LOBBY_APP, (HANGAR_ALIAS,), lobby_app, SPACE_LOBBY, SPIKE_LABEL, SPIKE_LABEL_PROPS, SPIKE_TEXT,
)
BATTLE = SpikePlace(
    BATTLE_SPIKE_ALIAS, BATTLE_APP, BATTLE_PAGES, battle_app, SPACE_BATTLE, BATTLE_SPIKE_LABEL,
    BATTLE_SPIKE_LABEL_PROPS, BATTLE_SPIKE_TEXT, BATTLE_COVERS,
)


class InjectSpike(object):

    def __init__(self, place):
        self.place = place
        self.host = InjectHost(place.alias, SPIKE_PAGE, self)
        self.watch = ViewWatch(place.namespace, place.aliases, place.get_app, self._on_view, self.host.detach)
        self.surface = HudSurface()
        self.mode = SpikeMode()
        self.ticker = Ticker(SPIKE_TICK_S, self._tick)
        self.hotkey = Hotkey(SPIKE_HOTKEY[0], SPIKE_HOTKEY[1], self._next_mode)

    def start(self):
        place = self.place
        self.surface.create(place.label, dict(place.props, text=self._text()), place.space)
        self.hotkey.install()
        self.watch.start()

    @safe
    def _on_view(self, view):
        log('inject spike: %s view %s loaded' % (self.place.space, getattr(view, 'alias', None)))
        if self.host.attach(view) and self.place.covers:
            index = self.host.place_below(self.place.covers)
            log('inject spike: %s page placed below %s (index %s)' % (self.place.space, '/'.join(self.place.covers),
                                                                    index))

    def on_page(self, view):
        self._apply_mode()
        self.ticker.start()

    def on_gone(self):
        self.ticker.stop()
        log('inject spike: the %s page is gone (its view left or destroyed)' % self.place.space)

    def on_message(self, raw):
        log('inject spike: %s page says %s' % (self.place.space, raw if raw is None else raw[:200]))
        self.surface.handle(raw)
        self._push()

    def _tick(self):
        self.surface.update(self.place.label, {'text': self._text()})
        self._push()
        return self.host.attached()

    def _text(self):
        return spike_text(self.mode.name, datetime.datetime.now(), self.place.template)

    # The hangar always shows the cursor; in battle the page is told the cursor is shown only while editing, the way
    # the battle HUD is (the player holds Ctrl for it).
    def _push(self):
        mode = self.mode
        cursor = True if self.place.space == SPACE_LOBBY else mode.edit
        self.host.push(self.surface.encode(self.place.space, cursor, mode.edit))

    @safe
    def _next_mode(self):
        if not self.host.attached():
            return
        self.mode = self.mode.next()
        self._apply_mode()

    def _apply_mode(self):
        self.host.set_mouse(self.mode.mouse)
        self.surface.update(self.place.label, {'text': self._text()})
        self._push()
        mode = self.mode
        log('inject spike: %s mode %s (page edit %s, Scaleform mouse %s)'
            % (self.place.space, mode.name, mode.edit, mode.mouse))


def start(dev):
    """Start the spikes once, when `dev` (a dev install) and OTMETKI_INJECT_SPIKE=1 or the flag file ask for it."""
    if _started or not spike_enabled(os.environ, os.path.isfile(SPIKE_FLAG), dev):
        return False
    for place in (HANGAR, BATTLE):
        spike = InjectSpike(place)
        spike.start()
        _started.append(spike)
    log('inject spike: on (%s), hangar and battle' % SPIKE_FLAG)
    return True

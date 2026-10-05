from __future__ import absolute_import, division, print_function, unicode_literals

import json

import BigWorld

from ....core.client.timer import Ticker
from ....core.compat import string_types
from ....core.events import EVENT_SETTINGS_CLOSE
from ....core.log import log, log_exception, safe
from ..model import decode_message, default_index, first_side, marker, viewer_state
from .constants import EMPTY_SELECTION, FOCUS_DELAY_S, FOCUS_S, LOGGED_MESSAGE_CHARS, SETTLE_ATTEMPTS, SETTLE_S, TICK_S
from .stage import HangarStage, is_exact
from .window import ViewerWindowHost, move_camera


# poliroid BattleHits' layout: the page lists the hits at the side, the hangar shows the vehicle with its turret and gun
# as the shot found them. With no battle recorded yet the page still opens, with its empty state.
class HitViewerScreen(object):

    def __init__(self, component, recorder):
        self.component = component
        self.recorder = recorder
        self.window = ViewerWindowHost(self.on_message, self.close, self.push, self._on_window_gone)
        self.stage = HangarStage(self._on_model_loaded)
        self.ticker = Ticker(TICK_S, self._tick)
        self.selection = dict(EMPTY_SELECTION)
        self.loaded = None
        self.wanted = None
        self.decoded = {}
        self.settling = 0

    @property
    def is_open(self):
        return self.window.is_open

    def refusal(self):
        if self.component.app.in_battle:
            return 'hv_refused_battle'
        if not self.window.available():
            return 'hv_refused_window'
        return None

    def _battles(self):
        return self.recorder.book.battles if self.recorder.book is not None else []

    def _find(self, battle_id):
        return self.recorder.book.battle(battle_id) if self.recorder.book is not None else None

    @safe
    def open(self, battle_id=None):
        refusal = self.refusal()
        if refusal is not None:
            log('hit viewer: not opened: %s' % refusal)
            return
        self.component.app.bus.emit(EVENT_SETTINGS_CLOSE)
        if not self.is_open:
            if not self.window.open():
                log('hit viewer: not opened: the viewer page is not registered with OpenWG Gameface')
                return
            self.stage.begin()
            self.ticker.start()
            log('hit viewer: opened, %d recorded battles' % len(self._battles()))
        self._select_battle(self._find(battle_id))

    @safe
    def close(self, restore_hangar=True):
        if not self.is_open:
            return
        self.window.close(restore_hangar)
        self._release()

    @safe
    def _on_window_gone(self):
        self._release()

    def _forget_model(self):
        self.loaded, self.wanted, self.decoded = None, None, {}
        self.settling += 1

    def _release(self):
        self.ticker.stop()
        self.stage.end()
        self._forget_model()
        log('hit viewer: closed')

    def battle(self):
        battle = self._find(self.selection['battle'])
        return battle if battle is not None and battle['id'] == self.selection['battle'] else None

    def battles_changed(self):
        if not self.is_open:
            return
        battle = self._find(self.selection['battle'])
        if battle is None or battle['id'] != self.selection['battle']:
            self._select_battle(battle)

    def _select_battle(self, battle):
        if battle is None:
            self._forget_model()
            self.selection = dict(EMPTY_SELECTION)
            self._show_selected()
            return
        if battle['id'] != self.selection['battle']:
            self._forget_model()
        tab = first_side(battle)
        self.selection = {'battle': battle['id'], 'tab': tab, 'index': default_index(battle, tab)}
        self._show_selected()

    def _select_tab(self, tab):
        battle = self.battle()
        if battle is None:
            return
        self.selection = dict(self.selection, tab=tab, index=default_index(battle, tab))
        self._show_selected()

    def _select_hit(self, index):
        battle = self.battle()
        if battle is None or index >= len(battle['hits']):
            return
        self.selection = dict(self.selection, index=index)
        self._show_selected()

    def _show_selected(self):
        battle, index = self.battle(), self.selection['index']
        if battle is None or index is None:
            self.stage.scene.hide()
            self.push()
            return
        key = battle['hits'][index]['target']
        if key == self.loaded:
            self._focus()
        elif key != self.wanted:
            self._forget_model()
            self.wanted = key
            self.stage.show(battle['targets'][key])
        self.push()

    @safe
    def _on_model_loaded(self):
        if self.battle() is None or self.wanted is None:
            return
        self.loaded, self.decoded = self.wanted, {}
        self.settling += 1
        self._focus()
        self._settle(self.settling, 0)

    def _target_hits(self, battle):
        return [(index, hit) for index, hit in enumerate(battle['hits']) if hit['target'] == self.loaded]

    # Places every hit of the loaded vehicle in its part and measures the plate under it, again on the next frames
    # while the hangar vehicle's collision is not there yet.
    @safe
    def _settle(self, token, attempt):
        battle = self.battle()
        if token != self.settling or battle is None or self.loaded is None:
            return
        hits = self._target_hits(battle)
        had_selected = self.selection['index'] in self.decoded
        self._place(hits)
        if not had_selected and self.selection['index'] in self.decoded:
            self._focus()
        if self._measure(battle, hits):
            self.recorder.book.save()
        self.push()
        missing = [index for index, hit in hits if index not in self.decoded or hit.get('angle') is None]
        if not missing:
            return
        if attempt + 1 < SETTLE_ATTEMPTS:
            BigWorld.callback(SETTLE_S, lambda: self._settle(token, attempt + 1))
            return
        log('hit viewer: vehicle %s: %d of %d hits placed, %d measured, collision %s' % (
            self.loaded, len(self.decoded), len(hits), len(hits) - len(missing),
            'missing' if self.stage.collisions() is None else 'present'))

    def _place(self, hits):
        boxes = self.stage.boxes()
        for index, hit in hits:
            if index not in self.decoded:
                found = self.stage.geometry(hit['segments'], boxes)
                if found is not None:
                    self.decoded[index] = found

    def _measure(self, battle, hits):
        measured = False
        for index, hit in hits:
            if index not in self.decoded or hit.get('angle') is not None:
                continue
            try:
                analysis = self.stage.measure(self.decoded[index], hit.get('shell'), hit.get('caliber'))
            except Exception:
                log_exception('hit viewer: measure')
                continue
            if analysis is not None and self.recorder.book.measured(battle['id'], index, analysis):
                measured = True
        return measured

    def _focus(self):
        battle, index = self.battle(), self.selection['index']
        if battle is None or index is None:
            return
        self.stage.pose(battle['hits'][index].get('aim'))
        BigWorld.callback(FOCUS_DELAY_S, safe(lambda: self._fly(index)))

    def _fly(self, index):
        battle, geometry = self.battle(), self.decoded.get(index)
        if geometry is None or battle is None or index != self.selection['index']:
            return
        self.stage.focus(geometry, battle['hits'][index], FOCUS_S)

    def stage_state(self):
        battle = self.battle()
        target = battle['targets'].get(self.wanted) if battle is not None and self.wanted else None
        is_loading = self.loaded is None and self.wanted is not None
        return {'loading': is_loading, 'approx': bool(target) and not is_exact(target)}

    @safe
    def push(self):
        if not self.is_open:
            return
        state = viewer_state(self._battles(), self.selection, self.component.app.translate, self.stage_state())
        self.window.push_state(json.dumps(state, sort_keys=True))

    @safe
    def _tick(self):
        battle = self.battle()
        if battle is None or not self.decoded:
            self.window.push_marks(json.dumps({'selected': None, 'marks': []}))
            return
        marks = []
        for index, geometry in sorted(self.decoded.items()):
            hit = battle['hits'][index]
            if hit['side'] == self.selection['tab']:
                point, tail = self.stage.clip(geometry)
                found = marker(index, hit['outcome'], point, tail)
                if found is not None:
                    marks.append(found)
        self.window.push_marks(json.dumps({'selected': self.selection['index'], 'marks': marks}, sort_keys=True))

    @safe
    def on_message(self, raw):
        decoded = decode_message(raw)
        if decoded is None:
            shown = raw[:LOGGED_MESSAGE_CHARS] if isinstance(raw, string_types) else type(raw).__name__
            log('hit viewer: a page message was not understood: %r' % (shown,))
            return
        command, fields = decoded
        handlers = {
            'ready': lambda: self.push(),
            'close': lambda: self.close(),
            'battle': lambda: self._open_battle(fields['id']),
            'tab': lambda: self._select_tab(fields['tab']),
            'select': lambda: self._select_hit(fields['index']),
            'move': lambda: move_camera(fields['dx'], fields['dy'], fields['dz']),
        }
        handlers[command]()

    def _open_battle(self, battle_id):
        battle = self._find(battle_id)
        if battle is not None:
            self._select_battle(battle)

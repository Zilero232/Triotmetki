from __future__ import absolute_import, division, print_function, unicode_literals

import json

import BigWorld

from ....core.client.timer import Ticker
from ....core.events import EVENT_SETTINGS_CLOSE
from ....core.log import log, log_exception, safe
from ..model import decode_message, default_index, first_side, marker, viewer_state
from .constants import FOCUS_S, TICK_S
from .stage import HangarStage, is_exact
from .window import ViewerWindowHost, move_camera


# poliroid BattleHits' layout: the page lists the hits at the side, the hangar shows the vehicle with its turret and gun
# as the shot found them.
class HitViewerScreen(object):

    def __init__(self, component, recorder):
        self.component = component
        self.recorder = recorder
        self.window = ViewerWindowHost(self.on_message, self.close, self.push, self._on_window_gone)
        self.stage = HangarStage(self._on_model_loaded)
        self.ticker = Ticker(TICK_S, self._tick)
        self.selection = {'battle': None, 'tab': None, 'index': None}
        self.loaded = None
        self.wanted = None
        self.decoded = {}

    @property
    def is_open(self):
        return self.window.is_open

    def refusal(self, battle_id=None):
        if self.component.app.in_battle:
            return 'hv_refused_battle'
        if not self.window.available():
            return 'hv_refused_window'
        if self.recorder.book is None or self.recorder.book.battle(battle_id) is None:
            return 'hv_refused_empty'
        return None

    @safe
    def open(self, battle_id=None):
        if self.refusal(battle_id) is not None:
            return
        self.component.app.bus.emit(EVENT_SETTINGS_CLOSE)
        if not self.is_open:
            if not self.stage.begin() or not self.window.open():
                log('hit viewer: the hangar or the Gameface page is not ready')
                self.stage.end()
                return
            self.ticker.start()
            log('hit viewer: opened')
        self._select_battle(self.recorder.book.battle(battle_id))

    @safe
    def close(self, restore_hangar=True):
        if not self.is_open:
            return
        self.window.close(restore_hangar)
        self._release()

    @safe
    def _on_window_gone(self):
        self._release()

    def _release(self):
        self.ticker.stop()
        self.stage.end()
        self.loaded, self.wanted, self.decoded = None, None, {}
        log('hit viewer: closed')

    def battle(self):
        if self.recorder.book is None:
            return None
        battle = self.recorder.book.battle(self.selection['battle'])
        return battle if battle is not None and battle['id'] == self.selection['battle'] else None

    def battles_changed(self):
        if not self.is_open:
            return
        battle = self.recorder.book.battle(self.selection['battle']) if self.recorder.book is not None else None
        if battle is None:
            self.close()
        elif battle['id'] != self.selection['battle']:
            self._select_battle(battle)

    def _select_battle(self, battle):
        if battle['id'] != self.selection['battle']:
            self.loaded, self.wanted, self.decoded = None, None, {}
        tab = first_side(battle)
        self.selection = {'battle': battle['id'], 'tab': tab, 'index': default_index(battle, tab)}
        self._show_selected()

    def _select_tab(self, tab):
        battle = self.battle()
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
            self.wanted, self.loaded, self.decoded = key, None, {}
            self.stage.show(battle['targets'][key])
        self.push()

    @safe
    def _on_model_loaded(self):
        battle = self.battle()
        if battle is None or self.wanted is None:
            return
        self.loaded, self.decoded = self.wanted, {}
        measured = False
        for index, hit in enumerate(battle['hits']):
            if hit['target'] == self.loaded:
                measured = self._decode(battle, index, hit) or measured
        if measured:
            self.recorder.book.save()
        if not self.decoded:
            log('hit viewer: no hit of the vehicle %s decoded on the model: no collisions or decoder' % self.loaded)
        self._focus()
        self.push()

    def _decode(self, battle, index, hit):
        try:
            decoded = self.stage.decode(hit['segments'])
        except Exception:
            log_exception('hit viewer: decode')
            return False
        if decoded is None:
            return False
        self.decoded[index] = decoded
        if hit.get('angle') is not None:
            return False
        analysis = self.stage.measure(decoded, hit.get('shell'), hit.get('caliber'))
        return analysis is not None and self.recorder.book.measured(battle['id'], index, analysis)

    def _focus(self):
        battle, index = self.battle(), self.selection['index']
        if battle is None or index is None:
            return
        self.stage.pose(battle['hits'][index].get('aim'))
        BigWorld.callback(0, safe(lambda: self._fly(index)))

    def _fly(self, index):
        battle, decoded = self.battle(), self.decoded.get(index)
        if decoded is None or battle is None or index != self.selection['index']:
            return
        self.stage.focus(decoded, battle['hits'][index], FOCUS_S)

    def stage_state(self):
        battle = self.battle()
        target = battle['targets'].get(self.wanted) if battle is not None and self.wanted else None
        is_loading = self.loaded is None and self.wanted is not None
        return {'loading': is_loading, 'approx': bool(target) and not is_exact(target)}

    @safe
    def push(self):
        if not self.is_open or self.recorder.book is None:
            return
        state = viewer_state(self.recorder.book.battles, self.selection, self.component.app.translate,
                             self.stage_state())
        self.window.push_state(json.dumps(state, sort_keys=True))

    @safe
    def _tick(self):
        battle = self.battle()
        if battle is None or not self.decoded:
            self.window.push_marks(json.dumps({'selected': None, 'marks': []}))
            return
        marks = []
        for index, decoded in sorted(self.decoded.items()):
            hit = battle['hits'][index]
            if hit['side'] == self.selection['tab']:
                point, tail = self.stage.clip(decoded)
                found = marker(index, hit['outcome'], point, tail)
                if found is not None:
                    marks.append(found)
        self.window.push_marks(json.dumps({'selected': self.selection['index'], 'marks': marks}, sort_keys=True))

    @safe
    def on_message(self, raw):
        decoded = decode_message(raw)
        if decoded is None:
            log('hit viewer: a page message was not understood')
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
        battle = self.recorder.book.battle(battle_id)
        if battle is not None:
            self._select_battle(battle)

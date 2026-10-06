"""The Gameface HUD page's side of the renderer: the labels as one JSON state, the page's messages back.

`HudSurface` keeps every label the layer created (GUIFlash props) with the GUI space it was created in, so a hangar
label never shows in battle and the other way round, as GUIFlash does. `encode(space, cursor, edit)` is the view model's
`state` property: `{v, cursor, edit, hover, panels: [{id, text, x, y, align_x, align_y, alpha, drag, border, visible,
scale, kind, widget, dock, attach, hint, cover}]}`; `widget` is a panel's structured payload (`core.hud.widget`) or
None, drawn instead of `text` when the page knows its kind; `dock` (`{group, order}` or None, `core.hud.panel.dock_of`)
stacks the panels of one column at its anchor; `attach` (`{kind, bar, minimap}` or None, `core.hud.panel.attach_of`)
places a panel at its default place beside a stock element; `cover` (`COVERS`) is what a covering stock view does to the
panel (`stats` under Tab, `modal` under the Esc menu): faded, and no mouse, drag or tooltip while it is set. `edit` is
true while panels can be moved (the backend decides: the edit modifier held in the hangar, the cursor shown in battle)
and a cursor is shown: only then does a panel take the mouse, show its frame and move. `hover` (battle) makes the page
take the mouse only over the panel under the pointer, so the cursor still reaches the minimap and the team lists; in the
hangar the whole screen is taken while editing.

The page sends `{type: 'ready'}` once it can draw, `{type: 'moved', id, x, y, align_x, align_y}` after a drag,
`{type: 'resized', id, scale}` after a wheel turn, `{type: 'pressed', id}` when the player clicks a button panel, and
`{type: 'mouse', event}` the first time it sees the pointer over a panel, a press or a wheel turn in edit mode, and
`{type: 'drawn', ids}` whenever the panels it laid out with a size changed (a panel replaces a stock element only while
the page draws it), and `{type: 'area', whole}` whenever its input area turns into the whole screen or back to its
buttons and the panel under the pointer.
`handle(raw)` decodes one message; the ui-web side is `src/shared/api/hud-protocol` (a test checks both command
lists).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import json

from ...compat import clamp, is_number, string_types, to_text
from ...log import log_exception
from ..panel.constants import ATTACH_KINDS
from .constants import (
    ALIGN_X,
    ALIGN_Y,
    ATTACH_NUMBERS,
    COVERS,
    DOCK_NUMBERS,
    HUD_COMMANDS,
    HUD_JSON,
    HUD_MAX_DRAWN,
    HUD_MAX_MESSAGE_CHARS,
    HUD_MESSAGE_ARG,
    HUD_PROTOCOL_VERSION,
    HUD_RES_MAP_ID,
    HUD_SEND_COMMAND,
    HUD_STATE_PROPERTY,
    KIND_BUTTON,
    KIND_LABEL,
    KINDS,
    MOUSE_EVENTS,
    PANEL_KEYS,
    POSITION_LIMIT,
    SCALE_LIMITS,
    SPACE_BATTLE,
    SPACE_LOBBY,
    SUMMARY_ENTRY,
    SUMMARY_HIDDEN,
    SUMMARY_PREFIXES,
    SUMMARY_TEXT,
)
from .push import FramePush

__all__ = (
    'HUD_COMMANDS',
    'HUD_MESSAGE_ARG',
    'HUD_PROTOCOL_VERSION',
    'HUD_RES_MAP_ID',
    'HUD_SEND_COMMAND',
    'HUD_STATE_PROPERTY',
    'FramePush',
    'HudSurface',
    'KIND_BUTTON',
    'KIND_LABEL',
    'SPACE_BATTLE',
    'SPACE_LOBBY',
    'decode_hud_message',
)


def _is_plain_number(value):
    return is_number(value) and not isinstance(value, bool)


def _position(value):
    if not _is_plain_number(value):
        return None
    return clamp(int(round(value)), -POSITION_LIMIT, POSITION_LIMIT)


def _scale(value):
    if not _is_plain_number(value):
        return None
    low, high = SCALE_LIMITS
    return round(clamp(float(value), low, high), 2)


def _moved(message):
    x = _position(message.get('x'))
    y = _position(message.get('y'))
    if x is None or y is None:
        return None

    fields = {'x': x, 'y': y}
    if message.get('align_x') in ALIGN_X:
        fields['alignX'] = message['align_x']
    if message.get('align_y') in ALIGN_Y:
        fields['alignY'] = message['align_y']
    return fields


def _resized(message):
    scale = _scale(message.get('scale'))
    if scale is None:
        return None
    return {'scale': scale}


def _is_dock(value):
    if not isinstance(value, dict):
        return False
    return isinstance(value.get('group'), string_types) and is_number(value.get('order'))


def _dock(value):
    if not _is_dock(value):
        return None

    dock = {'group': to_text(value['group']), 'order': int(value['order'])}
    for key in DOCK_NUMBERS:
        if is_number(value.get(key)):
            dock[key] = int(value[key])
    return dock


def _attach(value):
    if not isinstance(value, dict) or value.get('kind') not in ATTACH_KINDS:
        return None
    if not all(is_number(value.get(key)) and not isinstance(value.get(key), bool) for key in ATTACH_NUMBERS):
        return None
    attach = {'kind': to_text(value['kind'])}
    attach.update((key, int(value[key])) for key in ATTACH_NUMBERS)
    return attach


def _mouse(message):
    if message.get('event') not in MOUSE_EVENTS:
        return None
    return {'event': message['event']}


def _area(message):
    whole = message.get('whole')
    return {'whole': whole} if isinstance(whole, bool) else None


def _drawn(message):
    ids = message.get('ids')
    if not isinstance(ids, list) or len(ids) > HUD_MAX_DRAWN:
        return None
    if not all(isinstance(alias, string_types) for alias in ids):
        return None
    return {'ids': tuple(to_text(alias) for alias in ids)}


_PANEL_FIELDS = {'moved': _moved, 'resized': _resized, 'pressed': lambda message: {}}
_PAGE_FIELDS = {'ready': lambda message: {}, 'mouse': _mouse, 'drawn': _drawn, 'area': _area}


def _parse_message(raw):
    if not isinstance(raw, string_types) or len(raw) > HUD_MAX_MESSAGE_CHARS:
        return None
    try:
        message = json.loads(to_text(raw))
    except ValueError:
        return None
    if not isinstance(message, dict) or message.get('type') not in HUD_COMMANDS:
        return None
    return message


def _panel_fields(command, message):
    alias = message.get('id')
    if not isinstance(alias, string_types):
        return None
    fields = _PANEL_FIELDS[command](message)
    if fields is None:
        return None
    fields['id'] = to_text(alias)
    return fields


def _fields(command, message):
    if command in _PAGE_FIELDS:
        return _PAGE_FIELDS[command](message)
    return _panel_fields(command, message)


def decode_hud_message(raw):
    message = _parse_message(raw)
    if message is None:
        return None

    command = message['type']
    fields = _fields(command, message)
    if fields is None:
        return None
    return command, fields


def _short_alias(alias):
    for prefix in SUMMARY_PREFIXES:
        if alias.startswith(prefix):
            return alias[len(prefix):]
    return alias


def _summary_entry(panel):
    name = _short_alias(panel['id'])
    kind = panel['widget']['kind'] if panel['widget'] and 'kind' in panel['widget'] else SUMMARY_TEXT
    entry = SUMMARY_ENTRY % (name, kind)
    return entry if panel['visible'] else entry + SUMMARY_HIDDEN


_MISSING = object()


# A dict sent again as the same object may have changed inside, so it always counts as a change.
def _changes(props, update):
    for key, value in update.items():
        old = props.get(key, _MISSING)
        if old != value or (isinstance(value, dict) and value is old):
            return True
    return False


# A push happens up to once a frame: each panel's JSON is kept until its props change and the state joins the kept ones.
class HudSurface(object):

    def __init__(self):
        self.labels = {}
        self.order = []
        self.fragments = {}

    def create(self, alias, props, space):
        if alias not in self.labels:
            self.order.append(alias)
        self.labels[alias] = {'props': dict(props or {}), 'space': space}
        self.fragments.pop(alias, None)

    def update(self, alias, props):
        label = self.labels.get(alias)
        if label is None:
            return False
        props = props or {}
        if _changes(label['props'], props):
            label['props'].update(props)
            self.fragments.pop(alias, None)
        return True

    def delete(self, alias):
        if self.labels.pop(alias, None) is None:
            return False
        self.order.remove(alias)
        self.fragments.pop(alias, None)
        return True

    def aliases(self, space):
        return [alias for alias in self.order if self.labels[alias]['space'] == space]

    def summary(self, space):
        """The labels of `space` for a log line: each alias without the common prefix, with its widget kind (or
        `text`) and `hidden` when it is not visible."""
        return [_summary_entry(self.panel(alias)) for alias in self.aliases(space)]

    def panel(self, alias):
        props = self.labels[alias]['props']
        panel = {'id': alias}
        for prop, key, default in PANEL_KEYS:
            value = props.get(prop, default)
            panel[key] = value if value is not None else default

        panel['text'] = to_text(panel['text'])
        panel['scale'] = _scale(panel['scale']) or 1.0
        if panel['kind'] not in KINDS:
            panel['kind'] = KIND_LABEL
        if not isinstance(panel['widget'], dict):
            panel['widget'] = None
        panel['dock'] = _dock(panel['dock'])
        panel['attach'] = _attach(panel['attach'])
        if panel['cover'] not in COVERS:
            panel['cover'] = COVERS[0]
        return panel

    @staticmethod
    def _head(space, cursor, edit):
        cursor = bool(cursor)
        return {
            'v': HUD_PROTOCOL_VERSION,
            'cursor': cursor,
            'edit': cursor and bool(edit),
            'hover': space == SPACE_BATTLE,
        }

    def state(self, space, cursor, edit=False):
        state = self._head(space, cursor, edit)
        state['panels'] = [self.panel(alias) for alias in self.aliases(space)]
        return state

    def encode(self, space, cursor, edit=False):
        """`state(space, cursor, edit)` as JSON text, built from the panels' kept fragments."""
        head = json.dumps(self._head(space, cursor, edit), **HUD_JSON)
        fragments = (self._fragment(alias) for alias in self.aliases(space))
        panels = ','.join(text for text in fragments if text)
        return '%s,"panels":[%s]}' % (head[:-1], panels)

    def _fragment(self, alias):
        text = self.fragments.get(alias)
        if text is None:
            text = self._encoded(alias)
            self.fragments[alias] = text
        return text

    # A feature that puts a value JSON cannot hold into its widget (a Math.Vector3, a set) hides its own panel, logged
    # once until its props change, instead of blanking the whole HUD on every push.
    def _encoded(self, alias):
        panel = self.panel(alias)
        try:
            return json.dumps(panel, **HUD_JSON)
        except (TypeError, ValueError):
            log_exception('HUD panel %s is not JSON, hidden' % alias)
        panel.update(text='', widget=None, visible=False)
        try:
            return json.dumps(panel, **HUD_JSON)
        except (TypeError, ValueError):
            return ''

    def handle(self, raw):
        decoded = decode_hud_message(raw)
        if decoded is None:
            return None

        fields = decoded[1]
        if 'id' not in fields:
            return decoded
        if fields['id'] not in self.labels:
            return None

        changes = {key: value for key, value in fields.items() if key != 'id'}
        self.update(fields['id'], changes)
        return decoded

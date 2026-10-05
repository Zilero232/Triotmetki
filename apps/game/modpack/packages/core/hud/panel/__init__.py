"""The per-panel settings schema: the layout keys every HUD panel has, plus the panel's own.

components.json stores (and a settings window edits) `x`, `y`, `align_x`, `align_y`, `alpha` (0-100), `drag` and
`scale` (percent, set with the edit modifier + wheel on the Gameface page) for every panel; `font_size` and `border` are
constants (`PANEL_FIXED`).
`layout_props` maps them to the renderer props (GUIFlash label names; `scale` and `kind` reach only the Gameface
page). The panel's on/off switch stays in the companion config.

components.json keeps every default it was written with, so a panel whose default place changed would keep the old one:
`panel_schema(..., retired=places)` names the places older versions gave the panel, and `retired_reset` moves a panel
still at one of them (never moved by the player) to its current default. A panel with a `pinned` key (team HP) stays at
its default place and takes no drag while the key is on.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

from ...compat import is_number, string_types, to_text
from ...settings import Schema, fix
from .constants import (
    ALIAS_PREFIX,
    ATTACHED,
    DOCK_ANCHORS,
    DOCKS,
    FIT_AXES,
    FOLLOWS,
    GAMEFACE_PROPS,
    HEX_COLOR,
    HINT_COMPONENTS,
    HINT_KEY,
    HINT_PREFIXES,
    LAYOUT_KEYS,
    MOVED_ALIGNS,
    PANEL_CHOICES,
    PANEL_DEFAULTS,
    PANEL_FIXED,
    PANEL_LIMITS,
    PLACE_KEYS,
)

__all__ = (
    'ALIAS_PREFIX',
    'ATTACHED',
    'DOCK_ANCHORS',
    'DOCKS',
    'FOLLOWS',
    'GAMEFACE_PROPS',
    'LAYOUT_KEYS',
    'MOVED_ALIGNS',
    'PANEL_DEFAULTS',
    'PanelSchema',
    'alias_of',
    'anchor_of',
    'attach_of',
    'component_of',
    'component_schema',
    'dock_layout',
    'dock_of',
    'fit_place',
    'hex_color',
    'is_pinned',
    'layout_props',
    'matching',
    'max_length',
    'moved_values',
    'panel_hint',
    'panel_of',
    'panel_schema',
    'pinned_values',
    'place_of',
    'retired_reset',
)


def component_schema(defaults, choices=None, limits=None, normalizers=None):
    """A schema for a component section; a non-panel component (hangar notifications) uses it directly.
    The on/off switch of a component is not here: it stays in the companion config (config.json)."""
    return Schema(dict(defaults or {}), choices=choices, limits=limits, normalizers=normalizers)


class PanelSchema(Schema):

    def __init__(self, defaults, choices=None, limits=None, normalizers=None, retired=()):
        Schema.__init__(self, defaults, choices=choices, limits=limits, normalizers=normalizers)
        self.retired = tuple(tuple(place) for place in retired)


def panel_schema(defaults=None, choices=None, limits=None, normalizers=None, retired=()):
    """The common panel keys plus the panel's own; the panel's defaults win (its own x/y, alignment)."""
    merged = dict(PANEL_DEFAULTS)
    merged.update(defaults or {})
    fixed = dict((key, merged.get(key, value)) for key, value in PANEL_FIXED.items())
    all_choices = dict(PANEL_CHOICES)
    all_choices.update(choices or {})
    all_limits = dict(PANEL_LIMITS)
    all_limits.update(limits or {})
    schema = PanelSchema(merged, choices=all_choices, limits=all_limits, normalizers=normalizers, retired=retired)
    return fix(schema, fixed)


def place_of(values):
    return tuple(values.get(key) for key in PLACE_KEYS)


def retired_reset(settings):
    """The values that move a panel still at a place an older version gave it by default to today's default place
    (empty when the player moved it, or the schema names no retired place)."""
    schema = settings.schema
    defaults = schema.defaults
    if place_of(settings) not in getattr(schema, 'retired', ()) or place_of(settings) == place_of(defaults):
        return {}
    return dict((key, defaults[key]) for key in PLACE_KEYS)


def fit_place(values):
    """The values that bring back a panel whose saved offset points off the screen from its anchor edge (moved there
    by an older renderer or by hand): the offset goes to that edge. Empty when the place is on screen at every size."""
    fixed = {}
    for key, align_key, near, far in FIT_AXES:
        value = values.get(key)
        align = values.get(align_key)
        if not is_number(value):
            continue
        if (align == near and value < 0) or (align == far and value > 0):
            fixed[key] = 0
    return fixed


def is_pinned(settings):
    return 'pinned' in settings.schema.defaults and bool(settings.get('pinned'))


def pinned_values(settings, values):
    if not is_pinned(settings):
        return values
    pinned = dict(values)
    pinned.update((key, settings.schema.defaults[key]) for key in PLACE_KEYS)
    pinned['drag'] = False
    return pinned


def max_length(limit):
    """A normalizer for free-text settings (templates): cut to `limit` characters."""
    def normalize(value):
        return value[:limit]
    return normalize


def matching(pattern, limit):
    """A normalizer for restricted text (image paths): None unless `pattern` matches."""
    def normalize(value):
        return value if len(value) <= limit and pattern.match(value) else None
    return normalize


def hex_color(value):
    """A normalizer for `#RRGGBB` colours (upper-cased)."""
    return value.upper() if HEX_COLOR.match(value) else None


def alias_of(panel_id):
    return ALIAS_PREFIX + panel_id


def panel_of(alias):
    return alias[len(ALIAS_PREFIX):] if alias.startswith(ALIAS_PREFIX) else None


def component_of(alias):
    """The id of the component that draws the panel `alias`."""
    if alias in HINT_COMPONENTS:
        return HINT_COMPONENTS[alias]
    for prefix in HINT_PREFIXES:
        if alias.startswith(prefix):
            return alias[len(prefix):].split('.')[0]
    return alias


def panel_hint(translate, alias):
    """The short description of what the panel `alias` shows (its tooltip on the Gameface page); empty without one."""
    if translate is None:
        return u''
    key = HINT_KEY % component_of(alias)
    text = translate(key)
    return u'' if text == key else text


def layout_props(settings):
    return {
        'x': settings.get('x'),
        'y': settings.get('y'),
        'alignX': settings.get('align_x'),
        'alignY': settings.get('align_y'),
        'alpha': round(settings.get('alpha') / 100, 2),
        'drag': bool(settings.get('drag')),
        'border': bool(settings.get('border')),
        'scale': round((settings.get('scale') or PANEL_DEFAULTS['scale']) / 100, 2),
    }


def moved_values(props):
    """The settings values of a renderer's drag or resize report (x, y, alignX, alignY, scale as a fraction)."""
    values = {}
    for key in ('x', 'y'):
        value = props.get(key)
        if is_number(value) and not isinstance(value, bool):
            values[key] = int(round(value))
    for prop, key in MOVED_ALIGNS:
        if isinstance(props.get(prop), string_types):
            values[key] = to_text(props[prop])
    scale = props.get('scale')
    if is_number(scale) and not isinstance(scale, bool):
        values['scale'] = int(round(scale * 100))
    return values


def anchor_of(group):
    anchor = DOCK_ANCHORS[group]
    return {'x': anchor['x'], 'y': anchor['y'], 'align_x': anchor['align_x'], 'align_y': anchor['align_y']}


def dock_layout(group):
    """The renderer props (x, y, alignX, alignY) of a docked column's anchor: a hangar label's default layout."""
    anchor = DOCK_ANCHORS[group]
    return {'x': anchor['x'], 'y': anchor['y'], 'alignX': anchor['align_x'], 'alignY': anchor['align_y']}


def _place(values):
    if not isinstance(values, dict):
        return (values.get('x'), values.get('y'), values.get('align_x'), values.get('align_y'))

    def read(key, prop):
        return values[key] if key in values else values.get(prop)
    return (read('x', 'x'), read('y', 'y'), read('align_x', 'alignX'), read('align_y', 'alignY'))


def dock_of(alias, values):
    """The `dock` prop of a panel: `{group, order}` while it sits at its column's anchor, else None (moved, or not
    docked)."""
    entry = DOCKS.get(alias)
    if entry is None or values is None:
        return None
    group, order = entry
    anchor = DOCK_ANCHORS[group]
    if _place(values) != (anchor['x'], anchor['y'], anchor['align_x'], anchor['align_y']):
        return None
    dock = {'group': group, 'order': order, 'reserve': anchor['reserve']}
    if 'ceiling' in anchor:
        dock['ceiling'] = anchor['ceiling']
    return dock


def attach_of(alias, values, defaults, metrics):
    """The `attach` prop of a panel: `{kind, bar, minimap}` while it sits at its default place and follows a stock
    element (`ATTACHED`), else None (moved, or not attached). `metrics` is core.hud.stock.stock_metrics."""
    kind = ATTACHED.get(alias)
    if kind is None or values is None or not defaults or _place(values) != place_of(defaults):
        return None
    return {'kind': kind, 'bar': metrics['bar'], 'minimap': metrics['minimap']}

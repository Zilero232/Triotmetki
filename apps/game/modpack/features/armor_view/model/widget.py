from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.hud.widget import widget
from ....core.vendor import attr
from .cells import encode_cells
from .constants import (
    CHANCE_TONES,
    LEGEND_KIND,
    MAP_KIND,
    MODE_KEYS,
    MODE_SHELL,
    MODES,
    PATTERN_SCREEN,
    PATTERN_TRACK,
    SEPARATOR,
    SHELL_KIND_KEYS,
    STATUS_BUILDING,
    STATUS_TONES,
    THICKNESS_STOPS,
    TONE_ALWAYS,
    TONE_GUN,
    TONE_NEVER,
    TONE_RICOCHET,
    TONE_SPACED,
    TONE_TRACK,
)

FRACTION_DIGITS = 5
KIND_ENTRIES = (
    (TONE_SPACED, 0, 'armor_view_legend_spaced'),
    (TONE_TRACK, 0, 'armor_view_legend_track'),
    (TONE_GUN, 0, 'armor_view_legend_gun'),
    (0, PATTERN_SCREEN, 'armor_view_legend_behind_screen'),
    (0, PATTERN_TRACK, 'armor_view_legend_behind_track'),
)


@attr.s(frozen=True)
class LegendView(object):
    """What the legend panel shows: the tank, the mode, the attacker and its shells (labels, the chosen one), the
    build's status and progress (0..1), and the hover card (`readout`, model.readout)."""

    target = attr.ib()
    mode = attr.ib()
    status = attr.ib()
    attacker = attr.ib(default=None)
    shell_labels = attr.ib(default=())
    shell_index = attr.ib(default=0)
    distance = attr.ib(default=100)
    progress = attr.ib(default=None)
    readout = attr.ib(default=None)


def _rounded(value):
    return round(value, FRACTION_DIGITS)


def map_widget(level, codes, mode, opacity):
    """The `armor_map` widget: the cells of one finished level over its screen box (fractions of the screen)."""
    box = level.box
    return widget(MAP_KIND, {
        'cols': level.cols,
        'rows': level.rows,
        'left': _rounded(box.left),
        'top': _rounded(box.top),
        'width': _rounded(box.width),
        'height': _rounded(box.height),
        'cells': encode_cells(codes),
        'mode': mode,
        'opacity': round(opacity / 100.0, 2),
    })


def shell_label(shell, power, translate):
    kind = translate(SHELL_KIND_KEYS.get(shell.kind, 'armor_view_shell_ap'))
    return translate('armor_view_shell_label', kind=kind, mm=int(round(power)))


def _modes(mode, translate):
    return [
        {'key': MODE_KEYS[name], 'label': translate('armor_view_mode_' + name), 'active': name == mode}
        for name in MODES
    ]


def _thickness_scale(translate):
    entries = [{'tone': index + 1, 'label': u'%d' % stop} for index, stop in enumerate(THICKNESS_STOPS)]
    last = {'tone': len(THICKNESS_STOPS) + 1, 'label': translate('armor_view_legend_over', mm=THICKNESS_STOPS[-1])}
    return entries + [last]


def _shell_scale(translate):
    entries = [{'tone': TONE_ALWAYS, 'label': translate('armor_view_legend_always')}]
    for lowest, tone in CHANCE_TONES[:-1]:
        entries.append({'tone': tone, 'label': u'%d %%' % int(round(lowest * 100))})
    entries.append({'tone': CHANCE_TONES[-1][1], 'label': translate('armor_view_legend_unlikely')})
    entries.append({'tone': TONE_NEVER, 'label': translate('armor_view_legend_never')})
    entries.append({'tone': TONE_RICOCHET, 'label': translate('armor_view_legend_ricochet')})
    return entries


def _kinds(translate):
    return [{'tone': tone, 'pattern': pattern, 'label': translate(key)} for tone, pattern, key in KIND_ENTRIES]


def _status(view, translate):
    text = translate('armor_view_status_' + view.status)
    if view.status == STATUS_BUILDING and view.progress is not None:
        text = translate('armor_view_status_progress', percent=int(round(view.progress * 100)))
    return text


def _shells(view):
    return [{'label': label, 'active': index == view.shell_index} for index, label in enumerate(view.shell_labels)]


def _attacker(view, translate):
    if view.mode != MODE_SHELL or not view.attacker:
        return None
    distance = translate('armor_view_distance_value', m=view.distance)
    return translate('armor_view_attacker', tank=view.attacker) + SEPARATOR + distance


def legend_widget(view, translate):
    """The `armor_legend` widget: title, mode tabs with their keys, the attacker's shells, the colour scale, the
    build's status, the hover card and the key hints."""
    is_shell = view.mode == MODE_SHELL
    scale = _shell_scale(translate) if is_shell else _thickness_scale(translate)
    unit = None if is_shell else translate('armor_view_legend_unit')

    return widget(LEGEND_KIND, {
        'title': translate('armor_view_title'),
        'tank': view.target or u'',
        'mode': view.mode,
        'modes': _modes(view.mode, translate),
        'attacker': _attacker(view, translate),
        'shells': _shells(view) if is_shell else [],
        'scale': scale,
        'unit': unit,
        'kinds': _kinds(translate),
        'status': _status(view, translate),
        'status_tone': STATUS_TONES[view.status],
        'readout': view.readout,
        'hint': translate('armor_view_hint_shell' if is_shell else 'armor_view_hint'),
    })

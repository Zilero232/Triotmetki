from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.vendor import attr
from .cells import encode_cells
from .constants import (
    CHANCE_TONES,
    DISTANCE_LIMITS,
    FRACTION_DIGITS,
    KIND_ENTRIES,
    MODE_SHELL,
    MODES,
    PAGE_LABELS,
    PROGRESS_STEPS,
    SHELL_KIND_KEYS,
    STATUS_BUILDING,
    STATUS_TONES,
    THICKNESS_STOPS,
    TONE_ALWAYS,
    TONE_NEVER,
    TONE_RICOCHET,
)
from .modules import modules_state
from .presets import PRESET_IDS
from .tanks import tank_state


@attr.s(frozen=True)
class Attacker(object):
    cd = attr.ib()
    name = attr.ib()
    tier = attr.ib(default=None)
    is_target = attr.ib(default=False)


@attr.s(frozen=True)
class PageView(object):
    tank = attr.ib()
    mode = attr.ib()
    garage = attr.ib(default=())
    query = attr.ib(default=u'')
    matches = attr.ib(default=())
    turrets = attr.ib(default=())
    choice = attr.ib(default=None)
    attacker = attr.ib(default=None)
    shell_labels = attr.ib(default=())
    shell_index = attr.ib(default=0)
    distance = attr.ib(default=100)


def _rounded(value):
    return round(value, FRACTION_DIGITS)


def map_state(level, codes, mode, opacity):
    box = level.box
    return {
        'cols': level.cols,
        'rows': level.rows,
        'left': _rounded(box.left),
        'top': _rounded(box.top),
        'width': _rounded(box.width),
        'height': _rounded(box.height),
        'cells': encode_cells(codes),
        'mode': mode,
        'opacity': round(opacity / 100.0, 2),
    }


def shell_label(shell, power, translate):
    kind = translate(SHELL_KIND_KEYS.get(shell.kind, 'armor_view_shell_ap'))
    return translate('armor_view_shell_label', kind=kind, mm=int(round(power)))


def stepped_progress(progress):
    if progress is None:
        return None
    steps = int(progress * PROGRESS_STEPS)
    return steps / PROGRESS_STEPS


def status_state(status, progress, translate):
    text = translate('armor_view_status_' + status)
    shown = stepped_progress(progress) if status == STATUS_BUILDING else None
    if shown is not None:
        text = translate('armor_view_status_progress', percent=int(round(shown * 100)))
    return {'text': text, 'tone': STATUS_TONES[status], 'progress': shown}


def _labels(translate):
    return {key: translate(i18n_key) for key, i18n_key in PAGE_LABELS}


def _modes(mode, translate):
    choices = []
    for name in MODES:
        choices.append({'id': name, 'label': translate('armor_view_mode_' + name), 'active': name == mode})
    return choices


def _thickness_scale(translate):
    entries = []
    for index, stop in enumerate(THICKNESS_STOPS):
        entries.append({'tone': index + 1, 'label': u'%d' % stop})

    over = translate('armor_view_legend_over', mm=THICKNESS_STOPS[-1])
    entries.append({'tone': len(THICKNESS_STOPS) + 1, 'label': over})
    return entries


def _shell_scale(translate):
    entries = [{'tone': TONE_ALWAYS, 'label': translate('armor_view_legend_always')}]
    for lowest, tone in CHANCE_TONES[:-1]:
        entries.append({'tone': tone, 'label': u'%d %%' % int(round(lowest * 100))})
    entries.append({'tone': CHANCE_TONES[-1][1], 'label': translate('armor_view_legend_unlikely')})
    entries.append({'tone': TONE_NEVER, 'label': translate('armor_view_legend_never')})
    entries.append({'tone': TONE_RICOCHET, 'label': translate('armor_view_legend_ricochet')})
    return entries


def _kinds(translate):
    kinds = []
    for tone, pattern, key in KIND_ENTRIES:
        kinds.append({'tone': tone, 'pattern': pattern, 'label': translate(key)})
    return kinds


def legend_state(mode, translate):
    is_shell = mode == MODE_SHELL
    scale = _shell_scale(translate) if is_shell else _thickness_scale(translate)
    unit = None if is_shell else translate('armor_view_legend_unit')
    return {'mode': mode, 'scale': scale, 'unit': unit, 'kinds': _kinds(translate)}


def _shells(view):
    shells = []
    for index, label in enumerate(view.shell_labels):
        shells.append({'label': label, 'active': index == view.shell_index})
    return shells


def _attacker(attacker):
    if attacker is None:
        return None
    return {'cd': attacker.cd, 'name': attacker.name, 'tier': attacker.tier, 'is_target': attacker.is_target}


def _cameras(translate):
    return [{'id': preset_id, 'label': translate('armor_view_camera_' + preset_id)} for preset_id in PRESET_IDS]


def _rows(rows, active_cd):
    return [tank_state(row, active_cd) for row in rows]


def page_state(view, translate):
    active_cd = view.tank.cd if view.tank is not None else None
    attacker_cd = view.attacker.cd if view.attacker is not None else None
    return {
        'labels': _labels(translate),
        'tank': tank_state(view.tank, active_cd) if view.tank is not None else None,
        'mode': view.mode,
        'modes': _modes(view.mode, translate),
        'garage': _rows(view.garage, active_cd),
        'query': view.query,
        'matches': _rows(view.matches, active_cd),
        'modules': modules_state(view.turrets, view.choice),
        'attacker': _attacker(view.attacker),
        'attackers': _rows(view.garage, attacker_cd),
        'shells': _shells(view),
        'distance': view.distance,
        'distance_limits': list(DISTANCE_LIMITS),
        'legend': legend_state(view.mode, translate),
        'cameras': _cameras(translate),
    }

from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.armor import (
    MAX_EFFECTIVE_MM,
    OUTCOME_MAIN,
    VERDICT_CHANCE,
    first_main,
    is_overmatched,
    normalization,
    trace,
    up_to_main,
    verdict,
)
from .constants import MAX_READOUT_LAYERS, MODE_SHELL, PART_KEYS, PLATE_KIND_KEYS, VERDICT_TONES


def millimetres(value, translate):
    if value >= MAX_EFFECTIVE_MM:
        return translate('armor_view_mm_over', mm=int(MAX_EFFECTIVE_MM))
    return translate('armor_view_mm', mm=int(round(value)))


def _plate_label(plate, translate):
    kind = translate(PLATE_KIND_KEYS[plate.kind])
    part = translate(PART_KEYS.get(plate.part, 'armor_view_part_hull'))
    return translate('armor_view_plate_label', kind=kind, part=part)


def _plate_value(plate, along, translate):
    return translate(
        'armor_view_plate_value',
        nominal=millimetres(plate.armor, translate),
        angle=int(round(plate.angle)),
        along=millimetres(along, translate),
    )


def _row(label, value, tone='text'):
    return {'label': label, 'value': value, 'tone': tone}


def armour_rows(plates, translate):
    rows = []
    for plate in plates[:MAX_READOUT_LAYERS]:
        label = _plate_label(plate, translate)
        value = _plate_value(plate, plate.effective, translate)
        rows.append(_row(label, value))
    return rows


def _step_rows(steps, translate):
    rows = []
    for step in steps[:MAX_READOUT_LAYERS]:
        value = _plate_value(step.plate, step.armor, translate)
        rows.append(_row(_plate_label(step.plate, translate), value))
    return rows


def _verdict_text(shell_verdict, translate):
    if shell_verdict.name == VERDICT_CHANCE:
        return translate('armor_view_verdict_chance', percent=int(round(shell_verdict.chance * 100)))
    return translate('armor_view_verdict_' + shell_verdict.name)


def _notes(steps, shell, translate):
    notes = []
    plates = [step.plate for step in steps]
    is_overmatch = any(is_overmatched(plate, shell) for plate in plates)
    if is_overmatch:
        notes.append(translate('armor_view_note_overmatch'))

    base = shell.rule['normalization'] if shell.rule is not None else 0.0
    is_widened = base and any(normalization(plate, shell) > base for plate in plates)
    if is_widened:
        notes.append(translate('armor_view_note_normalization'))
    return notes


def _needed_rows(shell_trace, attack, translate):
    if shell_trace.outcome != OUTCOME_MAIN:
        return []
    needed = _row(translate('armor_view_needed'), millimetres(shell_trace.needed, translate))
    power = translate('armor_view_power_value', mm=int(round(attack.power)), band=int(round(attack.randomness * 100)))
    return [needed, _row(translate('armor_view_power'), power)]


def shell_readout(plates, attack, translate):
    shell_trace = trace(plates, attack.shell)
    shell_verdict = verdict(shell_trace, attack.power, attack.randomness)

    rows = _step_rows(shell_trace.steps, translate)
    rows.extend(_needed_rows(shell_trace, attack, translate))
    rows.extend(_row(note, u'', 'muted') for note in _notes(shell_trace.steps, attack.shell, translate))
    return rows, _verdict_text(shell_verdict, translate), VERDICT_TONES[shell_verdict.name]


def _title(plates, translate):
    index = first_main(plates)
    plate = plates[index if index is not None else 0]
    return translate(PART_KEYS.get(plate.part, 'armor_view_part_hull'))


def readout(plates, mode, attack, translate):
    if not plates:
        return None
    shown = up_to_main(plates)
    title = _title(shown, translate)

    if mode == MODE_SHELL and attack is not None:
        rows, verdict_text, verdict_tone = shell_readout(shown, attack, translate)
        return {'title': title, 'rows': rows, 'verdict': verdict_text, 'verdict_tone': verdict_tone}
    return {'title': title, 'rows': armour_rows(shown, translate), 'verdict': None, 'verdict_tone': 'text'}

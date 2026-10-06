from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import format_number
from .constants import ASSIST_KINDS, GOLD_LABELS, KIND_RECEIVED, MINUS, NOTE_SEPARATOR, SILENT_OUTCOMES, SOURCE_SHOT


def shell_label(row, translate):
    shell = row.get('shell')
    if not shell:
        return ''
    if row.get('gold') and shell in GOLD_LABELS:
        return translate('dlog_shell_%s_gold' % shell)
    return translate('dlog_shell_' + shell)


def amount_text(row):
    damage = row.get('damage')
    if not damage:
        return ''
    if row['kind'] == KIND_RECEIVED:
        return MINUS + format_number(damage)
    return format_number(damage)


def source_word(row, translate):
    source = row.get('source')
    if not source or source == SOURCE_SHOT:
        return ''
    return translate('dlog_source_' + source)


def _outcome_word(row, translate):
    outcome = row.get('outcome')
    if outcome in SILENT_OUTCOMES:
        return ''
    return translate('dlog_outcome_' + outcome)


def _crits_word(row, translate):
    if not row.get('crits'):
        return ''
    return translate('dlog_crits', count=row['crits'])


def _hp_word(row, translate, show_hp):
    if not show_hp or row.get('hp') is None:
        return ''
    return translate('dlog_hp_left', hp=format_number(row['hp']))


def _ammo_rack_word(row, translate):
    return translate('dlog_source_ammo_rack') if row.get('ammo_rack') else ''


def row_note(row, translate, show_hp):
    if row['kind'] in ASSIST_KINDS:
        return translate('dlog_kind_' + row['kind'])

    words = (
        _outcome_word(row, translate),
        source_word(row, translate),
        _crits_word(row, translate),
        _ammo_rack_word(row, translate),
        _hp_word(row, translate, show_hp),
    )
    return NOTE_SEPARATOR.join(word for word in words if word)

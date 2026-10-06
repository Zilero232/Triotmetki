from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_MUTED, COLOR_NEUTRAL, Markup, font, format_number
from ....core.hud.icons import CLASS_GLYPHS
from ....core.templates import render_markup
from . import section_rows, shown_totals
from ..settings.constants import STYLE_COMPACT, STYLE_CUSTOM
from .constants import (
    COLOR_MACROS,
    COMPACT_TOTALS_SEPARATOR,
    ICON_RENDITION,
    ICON_ROOT,
    KIND_COLOR,
    MIN_ENTRY_FONT_SIZE,
    PALETTES,
    TOTAL_COLORS,
    TOTALS_SEPARATOR,
)
from .words import amount_text, row_note, shell_label, source_word


def palette_values(settings):
    colors = PALETTES.get(settings.get('palette'), PALETTES['graphite'])
    return dict(zip(COLOR_MACROS, colors))


def kind_color(kind, settings):
    macro, key = KIND_COLOR[kind]
    return settings.get(key) or palette_values(settings)[macro]


def kind_icon(kind, size):
    path = '%s/%s_%d.png' % (ICON_ROOT, kind, ICON_RENDITION)
    return Markup('<img src="img://%s" width="%d" height="%d"/>' % (path, size, size))


def class_icon(vehicle_class, size):
    glyph = CLASS_GLYPHS.get(vehicle_class)
    if not glyph or not size:
        return ''

    return kind_icon(glyph, size)


def entry_template(settings, translate):
    return settings.get('entry_template') or translate('dlog_entry_template')


def entry_values(row, translate, index, looks):
    icon_size = looks['icon_size']
    return {
        'icon': kind_icon(row['kind'], icon_size) if icon_size else '',
        'class': class_icon(row.get('class'), icon_size),
        'index': index,
        'amount': amount_text(row),
        'hits': row.get('hits', 1),
        'kind': translate('dlog_kind_' + row['kind']),
        'vehicle': row.get('vehicle') or '',
        'shell': shell_label(row, translate),
        'source': source_word(row, translate),
        'note': row_note(row, translate, looks['show_hp']) if looks['noted'] else '',
    }


def entry_color(row, settings):
    if not settings.get('kind_colors') or not row.get('damage'):
        return COLOR_MUTED

    return kind_color(row['kind'], settings)


def _custom_totals(log, settings):
    values = log.values()
    values.update(palette_values(settings))
    return render_markup(settings.get('template'), values)


def _built_in_totals(log, settings, translate):
    totals = shown_totals(log, settings)
    if settings.get('style') == STYLE_COMPACT:
        return COMPACT_TOTALS_SEPARATOR.join(format_number(value) for _, value in totals)

    colors = palette_values(settings)
    words = [
        font('%s %s' % (translate('dlog_total_' + key), format_number(value)), colors[TOTAL_COLORS[key]])
        for key, value in totals
    ]
    return Markup(TOTALS_SEPARATOR.join(words))


def totals_line(log, settings, translate):
    if settings.get('style') == STYLE_CUSTOM:
        text = _custom_totals(log, settings)
    else:
        text = _built_in_totals(log, settings, translate)
    return font(text, COLOR_NEUTRAL, settings.get('font_size'))


def entry_lines(log, settings, translate):
    rows = section_rows(log, settings)
    template = entry_template(settings, translate)
    entry_size = max(MIN_ENTRY_FONT_SIZE, settings.get('font_size') - 2)
    looks = {
        'icon_size': entry_size + 2 if settings.get('kind_icons') else None,
        'noted': settings.get('show_notes'),
        'show_hp': settings.get('show_hp'),
    }

    lines = []
    for index, row in enumerate(rows['dealt'] + rows['received']):
        item = entry_values(row, translate, index + 1, looks)
        text = Markup(render_markup(template, item).strip())
        lines.append(font(text, entry_color(row, settings), entry_size))
    return lines


def format_damage_log(log, settings, translate):
    return '\n'.join([totals_line(log, settings, translate)] + entry_lines(log, settings, translate))

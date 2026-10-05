from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.format import COLOR_MUTED, COLOR_NEUTRAL, font, format_number
from ....core.templates import render
from ....core.teams import TeamHp  # noqa: F401
from ..settings.constants import BESIDE_STOCK_PLACE, OVERLAY_STYLES
from .constants import (
    BAR_CHAR,
    COMPACT_STYLES,
    DIFF_FONT_DECREASE,
    MIN_DIFF_FONT_SIZE,
    PAIR_PARTS,
    SCORE_KEYS,
    SIDE_COLORS,
    STRIP_STYLES,
)
from .strip import strip_rows


def replaces_stock(settings):
    return bool(settings.get('replace_stock')) and settings.get('style') not in OVERLAY_STYLES


# The strip keeps its own place only where the stock one is really hidden: the renderer draws widgets and the strip
# replaces it (core.client.hud.panel hides the stock aliases only then).
def pinned_place(settings, renders_widgets):
    if renders_widgets and replaces_stock(settings):
        return settings.get('x'), settings.get('y')

    return BESIDE_STOCK_PLACE


def bar(value, maximum, width, color):
    filled = int(round(width * value / maximum)) if maximum > 0 else 0
    filled = max(0, min(width, filled))

    return font(BAR_CHAR * filled, color) + font(BAR_CHAR * (width - filled), COLOR_MUTED)


def signed(value):
    return ('+' if value > 0 else '') + format_number(value)


def score_pair(values, settings):
    allies_key, enemies_key = SCORE_KEYS[bool(settings.get('show_alive'))]
    return values[allies_key], values[enemies_key]


def score_text(values, settings):
    return font('%d : %d' % score_pair(values, settings), COLOR_NEUTRAL)


def icon_part(vehicle, tier, width, color):
    part = bar(vehicle['hp'], vehicle['max'], width, color)
    if tier is None:
        return part
    return font(tier, COLOR_MUTED) + u' ' + part


def icon_row(rows, width, color):
    return u' '.join(icon_part(vehicle, tier, width, color) for vehicle, tier in rows)


def format_icons(teams, settings, options):
    width = settings.get('icon_width')
    allies = icon_row(strip_rows(teams, True, options), width, settings.get('ally_color'))
    enemies = icon_row(strip_rows(teams, False, options), width, settings.get('enemy_color'))

    parts = [allies]
    if settings.get('show_score'):
        parts.append(score_text(teams.values(), settings))
    parts.append(enemies)
    return font(u'   '.join(parts), COLOR_NEUTRAL, settings.get('font_size'))


def format_panel(teams, settings, translate, options):
    if settings.get('style') in STRIP_STYLES and not settings.get('template'):
        return format_icons(teams, settings, options)
    return format_team_hp(teams.values(), settings, translate)


def side_parts(values, settings, side, shown):
    color = settings.get(SIDE_COLORS[side])
    parts = []
    if shown['bars']:
        parts.append(bar(values[side + '_hp'], values[side + '_max'], settings.get('bar_width'), color))
    if shown['numbers']:
        parts.append(font(format_number(values[side + '_hp']), color))
    return parts


def score_parts(values, settings, style):
    if settings.get('show_score'):
        return [score_text(values, settings)]
    if style == 'compact':
        return [font(':', COLOR_MUTED)]
    return []


def number_parts(values, settings, style):
    shown = PAIR_PARTS[style]
    allies = side_parts(values, settings, 'allies', shown)
    enemies = side_parts(values, settings, 'enemies', shown)

    return allies + score_parts(values, settings, style) + list(reversed(enemies))


def pair_style(settings):
    style = settings.get('style')
    if style in COMPACT_STYLES:
        return 'compact'

    return style


def diff_line(values, settings, translate):
    diff = values['diff']
    color_key = 'ally_color' if diff >= 0 else 'enemy_color'
    size = max(MIN_DIFF_FONT_SIZE, settings.get('font_size') - DIFF_FONT_DECREASE)
    return font(translate('team_hp_diff', diff=signed(diff)), settings.get(color_key), size)


def format_team_hp(values, settings, translate):
    size = settings.get('font_size')
    if settings.get('template'):
        return font(render(settings.get('template'), values), COLOR_NEUTRAL, size)

    style = pair_style(settings)
    lines = [font('  '.join(number_parts(values, settings, style)), COLOR_NEUTRAL, size)]
    if settings.get('show_diff') and style != 'compact':
        lines.append(diff_line(values, settings, translate))
    return '\n'.join(lines)

from __future__ import absolute_import, division, print_function, unicode_literals

# The stock shell tooltip (RU 1.45 client source: consumables_panel TOOLTIP_FORMAT) is `{HEADER}..{/HEADER}` with an
# optional `\n/{BODY}..{/BODY}`; its body lines are joined by a line break.
BODY_OPEN = '\n/{BODY}'
BODY_CLOSE = '{/BODY}'
LINE_BREAK = '\n'

# (stats key, i18n key): the lines of a tooltip that has no body (the client's technical info is off).
FULL_LINES = (
    ('damage', 'aim_info_shell_damage'),
    ('piercing', 'aim_info_shell_piercing'),
    ('speed', 'aim_info_shell_speed'),
    ('module_damage', 'aim_info_shell_module_damage'),
)
# The line the stock body never has.
EXTRA_LINES = (('module_damage', 'aim_info_shell_module_damage'),)

PERCENT = 100.0

# The settings window editor: field groups (spec 2026-09-30 section 12.3).
EDITOR_GROUPS = (
    ('target', ('target_distance',)),
    ('shells', ('shell_tooltips', 'aim_circle')),
)

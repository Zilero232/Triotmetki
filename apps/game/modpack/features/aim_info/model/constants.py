from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: consumables_panel TOOLTIP_FORMAT, `{HEADER}..{/HEADER}` plus an optional body.
BODY_OPEN = '\n/{BODY}'
BODY_CLOSE = '{/BODY}'
LINE_BREAK = '\n'

FULL_LINES = (
    ('damage', 'aim_info_shell_damage'),
    ('piercing', 'aim_info_shell_piercing'),
    ('speed', 'aim_info_shell_speed'),
    ('module_damage', 'aim_info_shell_module_damage'),
)
EXTRA_LINES = (('module_damage', 'aim_info_shell_module_damage'),)

EDITOR_GROUPS = (
    ('target', ('target_distance',)),
    ('shells', ('shell_tooltips',)),
)

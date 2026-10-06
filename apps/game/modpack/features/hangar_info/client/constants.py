from __future__ import absolute_import, division, print_function, unicode_literals

HANGAR_PANEL = 'otmetki.hangar_info'
# The client pings the servers itself at most every 10 minutes (predefined_hosts._PING_COOLDOWN_TIME);
# asking more often only returns the cached result.
PING_REQUEST_S = 60.0
LAYOUT_KEYS = ('x', 'y', 'align_x', 'align_y', 'scale')

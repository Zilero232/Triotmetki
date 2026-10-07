from __future__ import absolute_import, division, print_function, unicode_literals

HANGAR_PANEL = 'otmetki.hangar_info'
# The client pings at most every 10 minutes (predefined_hosts._PING_COOLDOWN_TIME).
PING_REQUEST_S = 60.0
# IServerStatsController.getStats() names a cluster without online figures this way.
STATS_UNAVAILABLE = 'unavailable'
LAYOUT_KEYS = ('x', 'y', 'align_x', 'align_y', 'scale')

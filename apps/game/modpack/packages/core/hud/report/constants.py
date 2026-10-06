from __future__ import absolute_import, division, print_function, unicode_literals

REPORT_PREFIX = 'HUD report (%s): '
REPORT_SEPARATOR = '; '
REPORT_ENTRY = '%s %s'
# The battle page and the stock elements we may replace: the ones it has, and the ones hidden for our panels.
REPORT_STOCK = '; stock on %s: found %s, hidden %s'
REPORT_NO_STOCK = '; stock: no battle page'
REPORT_NONE = '-'

STATUS_OFF = 'off'
STATUS_SHOWN = 'shown'
STATUS_INVISIBLE = 'shown, hidden by a covering view (V, loading, Tab)'
STATUS_OFF_SCREEN = 'shown off-screen at %s,%s (%s, %s)'
STATUS_HELD = 'held: %s'
STATUS_WAITING = 'waiting: %s'
STATUS_UNPUBLISHED = 'not published'
HELD_MUTED = 'the streamer hotkey'
HELD_BLOCKED = 'a streamer private panel'
HELD_LAYOUT = 'the %s battle type layout leaves it out'

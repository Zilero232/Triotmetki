from __future__ import absolute_import, division, print_function, unicode_literals

COMMAND_FIELD = 'command'

# A camera drag or wheel step from a page, in screen pixels and wheel units (RU 1.45 maps_training_base_view
# ._onMoveSpace passes the same dx, dy, dz on); anything larger is clamped.
MOVE_FIELDS = ('dx', 'dy', 'dz')
MAX_MOVE = 2000.0

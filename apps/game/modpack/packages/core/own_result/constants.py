from __future__ import absolute_import, division, print_function, unicode_literals

RESULT_WIN = 'win'
RESULT_LOSS = 'loss'
RESULT_DRAW = 'draw'
# The widget tone of each result (core/hud/widget TONES).
RESULT_TONES = {RESULT_WIN: 'good', RESULT_LOSS: 'bad', RESULT_DRAW: 'muted'}
# RU 1.45 battle results: `common.winnerTeam` 0 is a draw; the own vehicle's entry of `personal` (any key but `avatar`)
# carries `typeCompDescr` and its `team`.
DRAW_TEAM = 0
AVATAR_KEY = 'avatar'
VEHICLE_MARK = 'typeCompDescr'

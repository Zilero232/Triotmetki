from __future__ import absolute_import, division, print_function, unicode_literals

UPLOAD_TIMEOUT_S = 120.0
QUEUE_FILE = 'replays_%d.json'
STARTED_KEEP = 20
# RU 1.45 client source: settings_constants.GAME.REPLAY_ENABLED, 0 off, 1 last battle, 2 all.
REPLAY_SETTING = 'replayEnabled'
UPLOAD_RESPONSE_MAX_BYTES = 256 * 1024

from __future__ import absolute_import, division, print_function, unicode_literals

EVENT_COMPONENT_SETTINGS = 'component_settings'
EVENT_REPLAY_UPLOADED = 'replay_uploaded'
# replay_upload_request(request, reply): the replay manager asks the replay upload to send one replay (request None
# only asks whether it can); the upload answers reply(state) at once, and nobody answers when it is not installed.
EVENT_REPLAY_UPLOAD_REQUEST = 'replay_upload_request'
# settings_open(section): a package asks the in-game settings window to open at one of its pages (`battle`, `hangar`,
# `marks`, `replays`, `streamer`, `data`, `profiles`, `hud`); the ui package answers, nobody does without it.
EVENT_SETTINGS_OPEN = 'settings_open'
# settings_close(): a package asks the in-game settings window to close (the hit viewer opens over the hangar instead).
EVENT_SETTINGS_CLOSE = 'settings_close'
# hit_viewer_open(battle_id): a package asks the hit viewer to open at one recorded battle (an arenaUniqueID as text,
# or None for the latest); nobody answers without the hit viewer.
EVENT_HIT_VIEWER_OPEN = 'hit_viewer_open'
# hit_viewer_battles(reply): a package asks which battles the hit viewer can open; it answers reply(battle_ids) at once
# (arenaUniqueIDs as text) while it can open one in the hangar, and nobody answers without it.
EVENT_HIT_VIEWER_BATTLES = 'hit_viewer_battles'
# battle_progress_state(state): battle_progress's state of this battle after each change (its model progress_state:
# `main_gun`, `record`, `counts`), which the battle results card shows beside its own numbers.
EVENT_BATTLE_PROGRESS = 'battle_progress_state'

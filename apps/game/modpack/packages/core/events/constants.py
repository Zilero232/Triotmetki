from __future__ import absolute_import, division, print_function, unicode_literals

EVENT_COMPONENT_SETTINGS = 'component_settings'
EVENT_REPLAY_UPLOADED = 'replay_uploaded'
# replay_upload_request(request, reply): the replay manager asks the replay upload to send one replay (request None
# only asks whether it can); the upload answers reply(state) at once, and nobody answers when it is not installed.
EVENT_REPLAY_UPLOAD_REQUEST = 'replay_upload_request'
# settings_close(): a package asks the in-game settings window to close (the hit viewer opens over the hangar instead).
EVENT_SETTINGS_CLOSE = 'settings_close'
# mods_list_alert(on): a package asks for the badge on the mod's ModsList entry (a one-off notice, as ModsList's own
# alertModification is meant for) or for it to go out; the ui package answers, nobody does without it.
EVENT_MODS_LIST_ALERT = 'mods_list_alert'
# hit_viewer_open(battle_id): a package asks the hit viewer to open at one recorded battle (an arenaUniqueID as text,
# or None for the latest); nobody answers without the hit viewer.
EVENT_HIT_VIEWER_OPEN = 'hit_viewer_open'
# hit_viewer_battles(reply): a package asks which battles the hit viewer can open; it answers reply(battle_ids) at once
# (arenaUniqueIDs as text) while it can open one in the hangar, and nobody answers without it.
EVENT_HIT_VIEWER_BATTLES = 'hit_viewer_battles'
# battle_notice_lines(arena_id, reply): the battle results ask for the lines other packages add to the stock post-battle
# message of one battle (the session line); each answers reply(line) at once, nobody answers when it has nothing.
EVENT_BATTLE_NOTICE_LINES = 'battle_notice_lines'

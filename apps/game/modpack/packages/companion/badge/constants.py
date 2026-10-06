from __future__ import absolute_import, division, print_function, unicode_literals

# contract/badges.schema.json, docs/specs/2026-10-06-modpack-user-badge.md.
PREFERENCE_PATH = '/mod/badges/preference'
SHOW_KEY = 'show_pack_badge'
ENABLED_KEY = 'enabled'
# The settings window reports a change of the companion's own keys as bus `component_settings` for this id.
COMPANION_COMPONENT = 'companion'
STATE_KEY = 'badge_preference'

# An answer other than 200 or 400 (5xx, 429, a network failure, a 401 the rebind handles) is asked again later; a 400
# means this body will never pass, so the same value is not sent again until the player changes it.
RETRY_S = 300
REFUSED_STATUSES = (400,)
SYNCED = 'synced'
REFUSED = 'refused'
RETRY = 'retry'

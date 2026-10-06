from __future__ import absolute_import, division, print_function, unicode_literals

import re

# RU 1.45 client source: hangar spaces are the folders under res/spaces with a space.settings/hangarSettings
# (gui.ClientHangarSpace._readHangarSettings), addressed as 'spaces/<folder>' in lower case.
SPACES_PREFIX = 'spaces/'
SPACE_NAME = re.compile(r'^[a-z0-9_]{1,64}$')

ACTION_CHOOSE = 'choose'
ACTION_NATIVE = 'native'
ROW_NATIVE = 'native'
LAYOUT_GALLERY = 'gallery'

# RU 1.45 client: the spaces it ships (gui/hangars.xml names the mode ones) in the order the page lists them; each
# has its hangar_space_name_<folder> string. Any other folder gets a title made from its name.
KNOWN_SPACES = (
    'h08_mt_hangar',
    'h08_mt_hangar_wt',
    'h14_mt_wt_2025',
    'h16_mt_museum',
    'h00_armory_yard',
    'h33_comp7',
    'h33_battle_royale_2021',
    'h20_wot_bday',
)
NAME_KEY = 'hangar_space_name_%s'
# Developer and test spaces the client also ships (hangar_mt_lite_editor, 1006_3d_styles_test): never listed.
HIDDEN_MARKERS = ('test', 'editor')
HANGAR_NUMBER = re.compile(r'^h\d+_')
MT_PREFIX = 'mt_'

# The client has no pictures of its hangar spaces: these are the RU 1.45 client's own art of the event or mode the
# space belongs to (thematic art, not a render of the hangar); a space without one gets the window's drawn fallback.
WHITE_TIGER_ART = 'img://white_tiger/gui/maps/icons/welcome/background.png'
PREVIEWS = {
    'h08_mt_hangar_wt': WHITE_TIGER_ART,
    'h14_mt_wt_2025': WHITE_TIGER_ART,
    'h33_battle_royale_2021': 'img://battle_royale/gui/maps/intro/chapter_common.png',
    'h00_armory_yard': 'img://armory_yard/gui/maps/icons/shop/intro/slide_1.png',
}

# What choosing a hangar does now: the default hangar reloads, is already the one loaded, waits for the space
# being loaded, or waits for the regular hangar (a mode or event hangar is open, or the player is in battle).
PLAN_RELOAD = 'reload'
PLAN_LOADED = 'loaded'
PLAN_WAIT = 'wait'
PLAN_LATER = 'later'

# A look is a stock environment of a stock space, switched live (BigWorld.EnvironmentSwitcher) and written into the
# default hangar config's environment slot, the one the server's cmd_change_hangar notifications fill. RU 1.45 client
# files: spaces/<folder>/environments/environments.xml lists the environment GUIDs (dotted, the folder has dashes) and
# names the active one; each <GUID>/environment.xml carries its <name>, the handle the client switches by. The main
# hangar ships h08_mt_hangar_Autumn_TD2 (active, the 2026 re-skin grading), _TD1 (the earlier h08_autumn grading),
# _TD3 (rain drips on the lens, film grain) and Customization (the studio light of the customization view); Onslaught
# ships Night_N1_Light_shadow (active) and its own Customization. Rows of looks: (id, space folder, environment name).
LOOKS = (
    ('autumn', 'h08_mt_hangar', 'h08_mt_hangar_Autumn_TD2'),
    ('autumn_classic', 'h08_mt_hangar', 'h08_mt_hangar_Autumn_TD1'),
    ('autumn_rain', 'h08_mt_hangar', 'h08_mt_hangar_Autumn_TD3'),
    ('studio', 'h08_mt_hangar', 'Customization'),
    ('onslaught_night', 'h33_comp7', 'Night_N1_Light_shadow'),
)
LOOK_NAME_KEY = 'hangar_space_look_name_%s'
LOOK_ID = re.compile(r'^[A-Za-z0-9_]{1,64}$')
# Environments the manager will generate from recipes (docs/specs/2026-10-06-custom-hangars.md, phase 1b) carry this
# prefix: each one found in a space is a look of its own, named after the environment.
GENERATED_PREFIX = 'otm_'
ACTION_LOOK = 'look'
LOOK_ROW_PREFIX = 'look:'
# No pictures of the looks yet: screenshots of each look from the dev loop are a TODO (README, hangar_space); until
# then every look tile is the window's drawn fallback.
LOOK_PREVIEWS = {}
SUBTITLE_SEPARATOR = ' \u00b7 '

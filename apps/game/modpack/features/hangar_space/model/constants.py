from __future__ import absolute_import, division, print_function, unicode_literals

import re

# RU 1.45 client source: hangar spaces are the folders under res/spaces with a space.settings/hangarSettings
# (gui.ClientHangarSpace._readHangarSettings), addressed as 'spaces/<folder>' in lower case.
SPACES_PREFIX = 'spaces/'
# RU 1.45 gui/shared/utils/hangar_space_reloader.py buildHangarSpacePath: a name starting with 'space' is a path.
SPACE_PATH_MARK = 'space'
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
# The Three Marks looks the manager builds from the recipes of the hangar_looks package (apps/game/modpack/hangars):
# each has its hangar_space_look_name_<environment> string; any other otm_ environment gets a title from its name.
NAMED_GENERATED_LOOKS = ('otm_night', 'otm_sunset', 'otm_steel', 'otm_studio')
ACTION_LOOK = 'look'
LOOK_ROW_PREFIX = 'look:'
# No pictures of the looks yet: screenshots of each look from the dev loop are a TODO (README, hangar_space); until
# then every look tile is the window's drawn fallback.
LOOK_PREVIEWS = {}
SUBTITLE_SEPARATOR = ' \u00b7 '

# Previews of the player's own hangars: a screenshot of the 3D scene the player's client renders, taken without the
# interface once the hangar picked in the window has loaded, cropped to 16:9, scaled down and kept as a PNG under
# mods/configs/otmetki/hangar_previews/<space>[__<look>].png on that PC only (nothing is shipped or sent: the
# client's own render of the player's own client). The gallery sends a kept preview to the page as a data URI: the
# page's img:// and coui:// schemes read only the client's mounted resources (paths.xml mounts res_mods/<version>,
# the mods' packages and res), not mods/configs.
ACTION_REFRESH_PREVIEW = 'refresh_preview'
PREVIEW_FOLDER = 'hangar_previews'
PREVIEW_KEY_SEPARATOR = '__'
PREVIEW_EXTENSION = '.png'
PREVIEW_DATA_PREFIX = 'data:image/png;base64,'
# 256x144: the gallery tile is 210x118 design px (ui-web GalleryArt); a detailed 4K shot this size is a PNG of about
# 80 KB.
PREVIEW_SIZE = (256, 144)
# Each output pixel averages a 2x2 grid of source pixels inside its cell (a box filter on the cell's samples).
PREVIEW_TAPS = (0.25, 0.75)
# How long a pick or the refresh preview button waits for the hangar to be on screen with no window over it
# (the player closes the settings window), and how long the scene must stay so before the shot (textures stream in
# and the camera settles after a reload or an environment switch).
PREVIEW_ARM_S = 600.0
PREVIEW_SETTLE_S = 3.0
CHECK_IDLE = 'idle'
CHECK_WAIT = 'wait'
CHECK_EXPIRED = 'expired'
CHECK_CAPTURE = 'capture'

# The capture is a Windows bitmap (BigWorld.screenShot with the 'bmp' extension): BITMAPFILEHEADER then a DIB header
# whose width and height are signed (a negative height is a top-down image), 24- or 32-bit pixels in B, G, R order,
# uncompressed (BI_RGB) or with the standard 32-bit masks (BI_BITFIELDS), rows padded to 4 bytes.
BMP_MAGIC = b'BM'
BMP_PIXELS_OFFSET_AT = 10
BMP_SIZE_AT = 18
BMP_BITS_AT = 28
BMP_COMPRESSION_AT = 30
BMP_MASKS_AT = 54
BMP_HEADER_END = 34
BMP_BITS = (24, 32)
BMP_RGB = 0
BMP_BITFIELDS = 3
BMP_MASKS = (0x00FF0000, 0x0000FF00, 0x000000FF)
PNG_SIGNATURE = bytes(bytearray((0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)))
PNG_RGB = 2
PNG_DEPTH = 8
# PNG row filter 1 (Sub): each byte minus the same channel of the pixel to its left, which shrinks a photo-like
# image by about a third against no filter.
PNG_FILTER_SUB = 1
PNG_COMPRESSION = 9
RGB_CHANNELS = 3

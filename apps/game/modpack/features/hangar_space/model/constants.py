from __future__ import absolute_import, division, print_function, unicode_literals

import re

# RU 1.45 client source: gui.ClientHangarSpace._readHangarSettings, 'spaces/<folder>' in lower case.
SPACES_PREFIX = 'spaces/'
# RU 1.45 gui/shared/utils/hangar_space_reloader.py buildHangarSpacePath: a name starting with 'space' is a path.
SPACE_PATH_MARK = 'space'
SPACE_NAME = re.compile(r'^[a-z0-9_]{1,64}\Z')

ACTION_CHOOSE = 'choose'
ACTION_NATIVE = 'native'
ROW_NATIVE = 'native'
LAYOUT_GALLERY = 'gallery'

# RU 1.45 client: the spaces it ships (gui/hangars.xml names the mode ones).
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
HIDDEN_MARKERS = ('test', 'editor')
HANGAR_NUMBER = re.compile(r'^h\d+_')
MT_PREFIX = 'mt_'

# RU 1.45 client art of each space's event or mode; the client has no pictures of its spaces.
WHITE_TIGER_ART = 'img://white_tiger/gui/maps/icons/welcome/background.png'
PREVIEWS = {
    'h08_mt_hangar_wt': WHITE_TIGER_ART,
    'h14_mt_wt_2025': WHITE_TIGER_ART,
    'h33_battle_royale_2021': 'img://battle_royale/gui/maps/intro/chapter_common.png',
    'h00_armory_yard': 'img://armory_yard/gui/maps/icons/shop/intro/slide_1.png',
}

PLAN_RELOAD = 'reload'
PLAN_LOADED = 'loaded'
PLAN_WAIT = 'wait'
PLAN_LATER = 'later'

# RU 1.45 client source: BigWorld.EnvironmentSwitcher and the default hangar config's environment slot.
LOOKS = (
    ('autumn', 'h08_mt_hangar', 'h08_mt_hangar_Autumn_TD2'),
    ('autumn_classic', 'h08_mt_hangar', 'h08_mt_hangar_Autumn_TD1'),
    ('autumn_rain', 'h08_mt_hangar', 'h08_mt_hangar_Autumn_TD3'),
    ('studio', 'h08_mt_hangar', 'Customization'),
    ('onslaught_night', 'h33_comp7', 'Night_N1_Light_shadow'),
)
LOOK_NAME_KEY = 'hangar_space_look_name_%s'
LOOK_ID = re.compile(r'^[A-Za-z0-9_]{1,64}\Z')
GENERATED_PREFIX = 'otm_'
NAMED_GENERATED_LOOKS = ('otm_night', 'otm_sunset', 'otm_steel', 'otm_studio')
ACTION_LOOK = 'look'
LOOK_ROW_PREFIX = 'look:'
LOOK_PREVIEWS = {}
SUBTITLE_SEPARATOR = ' \u00b7 '

PREMIUM_FLAGS = (True, False)
SLOT_LABELS = {True: 'premium', False: 'basic'}
NO_ENVIRONMENT = '-'
ACTION_REFRESH_PREVIEW = 'refresh_preview'
ACTIONS = (ACTION_CHOOSE, ACTION_LOOK, ACTION_NATIVE, ACTION_REFRESH_PREVIEW)
PREVIEW_FOLDER = 'hangar_previews'
PREVIEW_KEY_SEPARATOR = '__'
PREVIEW_EXTENSION = '.png'
PREVIEW_DATA_PREFIX = 'data:image/png;base64,'
PREVIEW_SIZE = (256, 144)
PREVIEW_TAPS = (0.25, 0.75)
PREVIEW_ARM_S = 600.0
PREVIEW_SETTLE_S = 3.0
CHECK_IDLE = 'idle'
CHECK_WAIT = 'wait'
CHECK_EXPIRED = 'expired'
CHECK_CAPTURE = 'capture'

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
PNG_FILTER_SUB = 1
PNG_COMPRESSION = 9
RGB_CHANNELS = 3
BMP_UINT16 = '<H'
BMP_UINT32 = '<I'
BMP_SIZE_FORMAT = '<ii'
BMP_MASKS_FORMAT = '<III'
BMP_MASKS_SIZE = 12
PNG_UINT32 = '>I'
PNG_HEADER_FORMAT = '>IIBBBBB'
ROW_ALIGN_BITS = 32
ROW_ALIGN_BYTES = 4
BITS_PER_BYTE = 8
CRC_MASK = 0xFFFFFFFF
BYTE_MASK = 0xFF

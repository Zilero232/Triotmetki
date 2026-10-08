from __future__ import absolute_import, division, print_function, unicode_literals

# RU 1.45 client source: GAME.CAROUSEL_TYPE / DOUBLE_CAROUSEL_TYPE indices into CarouselTypeSetting.
CAROUSEL_TYPE = 'carouselType'
DOUBLE_CAROUSEL_TYPE = 'doubleCarouselType'
CAROUSEL_ROW_MODES = {'1': 0, '2': 1, '3': 1, '4': 1, '5': 1}
EXTRA_ROWS = ('3', '4', '5')
# The game's row count with its two-row type on (CarouselTypeSetting.getRowCount).
MULTI_ROW_COUNT = 2
LEGACY_CAROUSEL_ROWS = {'single': '1', 'double': '2'}
CAROUSEL_TILE_MODES = {'adaptive': 0, 'small': 1}

ACTION_DEMOUNT = 'demount_removable'
ACTION_CREW = 'crew_to_barracks'
ACTION_RETURN = 'return_crew'
ACTION_STYLE = 'remove_style'
ACTION_KEYS = (
    (ACTION_DEMOUNT, 'demount'),
    (ACTION_CREW, 'crew'),
    (ACTION_RETURN, 'return'),
    (ACTION_STYLE, 'style'),
)

# RU 1.45 client source: GRAPHICS.INTERFACE_SCALE, an index into interfaceScale.getScaleOptions().
INTERFACE_SCALE = 'interfaceScale'
INTERFACE_SCALES = {'auto': 0.0, 'x1': 1.0, 'x1_25': 1.25, 'x1_5': 1.5, 'x1_75': 1.75, 'x2': 2.0}
SCALE_TOLERANCE = 1e-3

REFUSE_LOCKED = 'locked'
REFUSE_NOTHING = 'nothing'
REFUSE_BERTHS = 'berths'

# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import re

COLOR_UP = '#7CD35B'
COLOR_DOWN = '#E3564A'
COLOR_NEUTRAL = '#F2EAD3'
COLOR_MUTED = '#A09A8B'
COLOR_WARN = '#F2B25B'

MISSING = u'-'
PLURAL_SEPARATOR = u'|'

# Word forms by language for `plural`/`count_phrase` (core.format.plural): Russian one|few|many, English one|other.
FORMS = {
    'battles': {'ru': u'бой|боя|боёв', 'en': u'battle|battles'},
    'hits': {'ru': u'попадание|попадания|попаданий', 'en': u'hit|hits'},
    'missions': {'ru': u'задача|задачи|задач', 'en': u'mission|missions'},
    'goals': {'ru': u'цель|цели|целей', 'en': u'goal|goals'},
    'players': {'ru': u'игрок|игрока|игроков', 'en': u'player|players'},
    'minutes': {'ru': u'минута|минуты|минут', 'en': u'minute|minutes'},
    'times': {'ru': u'раз|раза|раз', 'en': u'time|times'},
    'points': {'ru': u'очко|очка|очков', 'en': u'point|points'},
    'days': {'ru': u'день|дня|дней', 'en': u'day|days'},
    'hours': {'ru': u'час|часа|часов', 'en': u'hour|hours'},
    'tokens': {'ru': u'жетон|жетона|жетонов', 'en': u'token|tokens'},
    'marks': {'ru': u'отметка|отметки|отметок', 'en': u'mark|marks'},
}
DATE_TIME_FORMAT = '%d.%m.%Y %H:%M'

TAGS = re.compile(r'<[^>]*>')
# Python 2's \s matches only ASCII whitespace without re.UNICODE (no-break and thin spaces stay).
SPACES = re.compile(r'\s+', re.UNICODE)

# One colour per tier of the site's rating scale (RATING_TIERS in @otmetki/ratings), worst to best, as the site and
# XVM show them: a WN8 or a rating is painted with its tier's colour.
TIER_COLORS = {
    'very_bad': '#E3564A',
    'bad': '#F08A3E',
    'below_avg': '#F2C94C',
    'avg': '#D9D9B8',
    'good': '#7CD35B',
    'very_good': '#4FC3B0',
    'great': '#5B9BF2',
    'unicum': '#A06CF0',
    'super_unicum': '#D75BD9',
}

# The marks colour ramp: below the first mark, then 1, 2 and 3 marks (the percent a view shows).
MARK_COLORS = ('#A09A8B', '#C9A26B', '#C8D1DC', '#F2C94C')

# `&` goes first, so the entities the other two become are not escaped again.
MARKUP_ESCAPES = ((u'&', u'&amp;'), (u'<', u'&lt;'), (u'>', u'&gt;'))
FONT_COLOR = re.compile(r'^#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\Z')

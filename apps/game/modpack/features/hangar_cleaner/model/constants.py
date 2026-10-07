from __future__ import absolute_import, division, print_function, unicode_literals

import re

TEASER = 'teaser'
OFFER_BANNERS = 'offer_banners'
EVENT_ENTRIES = 'event_entries'

VERIFIED_CLIENTS = ((1, 45),)
CLIENT_VERSION = re.compile(r'(\d+)\.(\d+)\.\d+')

SWITCHES = {
    TEASER: 'hide_teaser',
    OFFER_BANNERS: 'hide_offer_banners',
    EVENT_ENTRIES: 'hide_event_entries',
}

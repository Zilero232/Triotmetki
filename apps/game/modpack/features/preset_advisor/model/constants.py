from __future__ import absolute_import, division, print_function, unicode_literals

ADVICE_PATH = '/tanks/%d/build-advice'
KINDS = ('equipment', 'directives', 'consumables')
PAYLOAD_VERSION = 1

CACHE_TTL_S = 6 * 60 * 60
RETRY_AFTER_S = 10 * 60
HTTP_OK = 200

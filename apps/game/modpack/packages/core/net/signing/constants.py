from __future__ import absolute_import, division, print_function, unicode_literals

DEVICE_HEADER = 'X-Otmetki-Device'
SIGNATURE_HEADER = 'X-Otmetki-Signature'
TIMESTAMP_HEADER = 'X-Otmetki-Timestamp'
NONCE_HEADER = 'X-Otmetki-Nonce'
SIGNATURE_PREFIX = 'sha256='
SIGNATURE_VERSION = 'v2'
NONCE_BYTES = 16
SERVER_TIME_HEADER = 'X-Otmetki-Server-Time'
STALE_REQUEST_STATUS = 428
JSON_CONTENT_TYPE = 'application/json'

HEADER_OPTIONS = {
    'now': None,
    'nonce': None,
    'content_type': JSON_CONTENT_TYPE,
    'extra_headers': (),
}

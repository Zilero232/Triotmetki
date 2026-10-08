from __future__ import absolute_import, division, print_function, unicode_literals

from ...core.vendor.enum34 import Enum

MAX_EVENTS = 2000
MAX_BATCH = 50
BASE_BACKOFF_S = 5.0
MAX_BACKOFF_S = 600.0
JITTER = 0.2
# The server's event ledger (MOD_INGEST.ledgerTtlSeconds) counts an event older than this before sent_at as a duplicate.
MAX_EVENT_AGE_S = 2 * 86400
# The server dedupes a battle result by its database key and accepts it at any age.
AGELESS_EVENT_TYPES = frozenset(['battle_result'])


class Outcome(Enum):

    SENT = 'sent'
    RETRY = 'retry'
    DROP = 'drop'
    AUTH = 'auth'
    SHRINK = 'shrink'

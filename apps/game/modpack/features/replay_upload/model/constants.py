from __future__ import absolute_import, division, print_function, unicode_literals

import re

from ....core.vendor.enum34 import Enum

UPLOAD_PATH = '/replays/mod'
FILE_FIELD = 'file'
UNSAFE_NAME_CHARS = re.compile(r'[^A-Za-z0-9._-]+')
MAX_NAME_LENGTH = 200
MAX_BYTES = 50 * 1024 * 1024
VISIBILITY_HEADER = 'X-Otmetki-Visibility'
VISIBILITY_PUBLIC = 'public'
VISIBILITY_PRIVATE = 'private'

MATCH_WINDOW_S = 300.0
MAX_CANDIDATES = 30
SETTLE_S = 5.0

MAX_PENDING = 50
MAX_SEEN = 500
FIRST_DELAY_S = 30.0
BUSY_RETRY_S = 15.0
LOCATE_RETRY_S = 60.0
LOCATE_TIMEOUT_S = 30 * 60.0
BASE_BACKOFF_S = 30.0
MAX_BACKOFF_S = 3600.0
QUOTA_BACKOFF_S = 6 * 3600.0
MAX_AGE_S = 7 * 24 * 3600.0
JITTER = 0.2

QUOTA_CODE = 'SUBSCRIPTION_REQUIRED'
DONE_STATUSES = (409,)
DROP_STATUSES = (400, 404, 413, 415, 422)

REQUEST_READY = 'ready'
REQUEST_OFF = 'off'
REQUEST_UNBOUND = 'unbound'
REQUEST_INVALID = 'invalid'


class JobResult(Enum):

    HTTP = 'http'
    MISSING = 'missing'
    BUSY = 'busy'
    TOO_LARGE = 'too_large'
    ERROR = 'error'
    STOPPED = 'stopped'


class Outcome(Enum):

    DONE = 'done'
    DROP = 'drop'
    AUTH = 'auth'
    QUOTA = 'quota'
    RETRY = 'retry'
    WAIT = 'wait'


OUTCOME_BY_RESULT = {
    JobResult.TOO_LARGE: Outcome.DROP,
    JobResult.BUSY: Outcome.WAIT,
    JobResult.STOPPED: Outcome.WAIT,
    JobResult.MISSING: Outcome.WAIT,
}

WAIT_BY_RESULT = {
    JobResult.BUSY: BUSY_RETRY_S,
    JobResult.STOPPED: 0.0,
    JobResult.MISSING: LOCATE_RETRY_S,
}

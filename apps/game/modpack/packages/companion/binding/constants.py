from __future__ import absolute_import, division, print_function, unicode_literals

import re

CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
CODE_LENGTH = 10
BIND_PATH = '/mod/bind'
REASON_NO_ACCOUNT = 'no_account'
MIN_SECRET_LENGTH = 32
CODE_PATTERN = re.compile('^[' + CODE_ALPHABET + ']{' + str(CODE_LENGTH) + r'}\Z')
# re.UNICODE: Python 2's \s alone misses a no-break space pasted with the code.
CODE_SEPARATORS = re.compile(r'[\s\-_]+', re.UNICODE)
FAILURE_KEYS = {
    'invalid_code': 'bind_failed_code',
    'code_not_found': 'bind_failed_code',
    'code_expired': 'bind_failed_code',
    'code_used': 'bind_failed_code',
    'account_mismatch': 'bind_failed_account',
    'rate_limited': 'bind_failed_rate_limited',
    'bad_response': 'bind_failed_response',
}
FAILURE_KEY = 'bind_failed'
PUBLIC_FIELDS = ('device_id', 'account_id', 'bound_at')
SEALED_FIELD = 'secret_dpapi'

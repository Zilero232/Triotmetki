from __future__ import absolute_import, division, print_function, unicode_literals

import re

CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
CODE_LENGTH = 10
BIND_PATH = '/mod/bind'
MIN_SECRET_LENGTH = 32
CODE_PATTERN = re.compile('^[' + CODE_ALPHABET + ']{' + str(CODE_LENGTH) + '}$')
# re.UNICODE: Python 2's \s alone misses a no-break space pasted with the code.
CODE_SEPARATORS = re.compile(r'[\s\-_]+', re.UNICODE)
# The bind refusals the server and the response check name (contract/bind.schema.json), each with its own string; any
# other reason shows the generic one, so no server text ever reaches the player's notifications.
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
# credentials.json: the game-folder copy keeps only these fields of an account, the %APPDATA% copy adds the sealed
# secret (core.durable.SecretBox). The manager reads and writes the same format.
PUBLIC_FIELDS = ('device_id', 'account_id')
SEALED_FIELD = 'secret_dpapi'

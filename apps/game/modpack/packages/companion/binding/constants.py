from __future__ import absolute_import, division, print_function, unicode_literals

import re

CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
CODE_LENGTH = 10
BIND_PATH = '/mod/bind'
MIN_SECRET_LENGTH = 32
CODE_PATTERN = re.compile('^[' + CODE_ALPHABET + ']{' + str(CODE_LENGTH) + '}$')
# re.UNICODE: Python 2's \s alone misses a no-break space pasted with the code.
CODE_SEPARATORS = re.compile(r'[\s\-_]+', re.UNICODE)

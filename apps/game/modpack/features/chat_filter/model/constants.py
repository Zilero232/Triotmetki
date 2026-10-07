from __future__ import absolute_import, division, print_function, unicode_literals

import re

WORD_SEPARATORS = re.compile(r'[,;\n]+')
MAX_SENDERS = 64

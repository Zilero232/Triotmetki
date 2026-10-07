from __future__ import absolute_import, division, print_function, unicode_literals

import re

SINGLE_PACKAGE = re.compile(r'^otmetki\.\d[\w.]*\.(mtmod|wotmod)\Z')
SPLIT_PACKAGE = re.compile(r'^(net\.triotmetki\.[a-z_]+|otmetki\.companion)_\d[\w.]*\.(mtmod|wotmod)\Z')

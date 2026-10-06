from __future__ import absolute_import, division, print_function, unicode_literals

import re

# tools/build/archive.file_name: the single package is otmetki.<version>.<ext>, a split one <id>_<version>.<ext>.
SINGLE_PACKAGE = re.compile(r'^otmetki\.\d[\w.]*\.(mtmod|wotmod)\Z')
SPLIT_PACKAGE = re.compile(r'^(net\.triotmetki\.[a-z_]+|otmetki\.companion)_\d[\w.]*\.(mtmod|wotmod)\Z')

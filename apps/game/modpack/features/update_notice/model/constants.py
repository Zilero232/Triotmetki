from __future__ import absolute_import, division, print_function, unicode_literals

import re

# The site's release index (apps/web/server modpack-releases: GET /modpack/releases/latest?game=<client version>, the
# newest release for that client, built from the published downloads/releases.json the manager reads).
LATEST_PATH = '/modpack/releases/latest?game=%s'
DOWNLOAD_PATH = '/mod'
STATUS_COMPATIBLE = 'compatible'

# tools/build/archive.file_name: a split package is <package id>_<version>.<ext>, the single one
# otmetki.<version>.<ext>.
SPLIT_FILE = re.compile(r'^(net\.triotmetki\.[a-z0-9_]+|otmetki\.companion)_(\d[\w.-]*)\.(?:mtmod|wotmod)$')
SINGLE_FILE = re.compile(r'^otmetki\.(\d[\w.-]*)\.(?:mtmod|wotmod)$')
SINGLE_ID = 'otmetki'
GAME_FOLDER = re.compile(r'^\d+(?:\.\d+){1,3}$')
VERSION_NUMBERS = re.compile(r'^\d+(?:\.\d+)*')
# The whole version the index names, shown in the update notification: anything else (markup included) is no release.
RELEASE_VERSION = re.compile(r'^\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.]+)?$')

MAX_VERSION = 32
STATE_KEY = 'update_notice'
ACTION_SKIP = 'skip_version'
ACTION_OPEN = 'open_download'
ACTION_CHECK = 'check_now'


from __future__ import absolute_import, division, print_function, unicode_literals

import re

LATEST_PATH = '/modpack/releases/latest?game=%s'
DOWNLOAD_PATH = '/mod'
STATUS_COMPATIBLE = 'compatible'

SPLIT_FILE = re.compile(r'^(net\.triotmetki\.[a-z0-9_]+|otmetki\.companion)_(\d[\w.-]*)\.(?:mtmod|wotmod)\Z')
SINGLE_FILE = re.compile(r'^otmetki\.(\d[\w.-]*)\.(?:mtmod|wotmod)\Z')
SINGLE_ID = 'otmetki'
# RU 1.45 version.xml: the full client version 'v.1.45.0.0 #2290' names the mods folder 1.45.0.0 it loads.
CLIENT_FOLDER = re.compile(r'(\d+(?:\.\d+){1,3})')
VERSION_NUMBERS = re.compile(r'^\d+(?:\.\d+)*')
RELEASE_VERSION = re.compile(r'^\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.]+)?\Z')

MAX_VERSION = 32
STATE_KEY = 'update_notice'
ACTION_SKIP = 'skip_version'
ACTION_OPEN = 'open_download'
ACTION_CHECK = 'check_now'


from __future__ import absolute_import, division, print_function, unicode_literals

import re

from ...core.events import EVENT_COMPONENT_SETTINGS, EVENT_LANGUAGE  # noqa: F401

CONFIG_COMPONENT = 'config'
CONFIG_KIND = 'config'

LANGUAGES = ('ru', 'en')
LANGUAGE_CHOICES = ('auto',) + LANGUAGES

NOTICE_INFO = 'info'
NOTICE_ERROR = 'error'
NOTICE_CODE = 'code'

TOOL_PAGES = ('profiles', 'hud')

SITE_URL = 'https://triotmetki.ru'
API_PREFIX = 'https://api.'
LOCAL_SITE_URL = 'http://localhost:3000'
LOCAL_HOSTS = ('http://localhost', 'http://127.0.0.1')
SAFE_PATH = re.compile(r'^/(?!/)[A-Za-z0-9/_.~%?=&-]*\Z')

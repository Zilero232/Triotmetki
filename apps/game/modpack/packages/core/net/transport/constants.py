from __future__ import absolute_import, division, print_function, unicode_literals

NETWORK_ERROR = 0
DEFAULT_TIMEOUT_S = 15.0
HTTP_WORKER = 'otmetki-http'
DEFAULT_WORKER = 'otmetki-worker'

# The API answers small JSON bodies; a larger answer is cut off and reported as a network error, so a hostile or broken
# server cannot fill the game's memory.
DEFAULT_MAX_RESPONSE_BYTES = 8 * 1024 * 1024
READ_BLOCK_BYTES = 64 * 1024

SECURE_SCHEME = 'https'
PLAIN_SCHEME = 'http'
# Plain http only reaches the developer's own machine (the dev server_url); everything else needs verified TLS.
LOOPBACK_HOSTS = ('localhost', '127.0.0.1')

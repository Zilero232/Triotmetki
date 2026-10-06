"""HTTP for the mod: blocking requests on a worker thread, callbacks handed back on the game's thread; https only with
a verified certificate and host name, no redirects, answers capped in size."""
from __future__ import absolute_import, division, print_function, unicode_literals

from .constants import DEFAULT_MAX_RESPONSE_BYTES, DEFAULT_TIMEOUT_S, NETWORK_ERROR
from .body import StoppableBody, TransferStopped
from .exchange import SyncTransport, ThreadTransport, native_headers, perform
from .headers import response_headers
from .runner import BackgroundRunner
from .tls import is_allowed_url, verified_context

__all__ = (
    'DEFAULT_MAX_RESPONSE_BYTES',
    'DEFAULT_TIMEOUT_S',
    'NETWORK_ERROR',
    'BackgroundRunner',
    'StoppableBody',
    'SyncTransport',
    'ThreadTransport',
    'TransferStopped',
    'is_allowed_url',
    'native_headers',
    'perform',
    'response_headers',
    'verified_context',
)

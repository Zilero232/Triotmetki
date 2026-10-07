"""HMAC-SHA256 request signing (v2) shared with the server, and the clock offset its 428 answers correct."""
from __future__ import absolute_import, division, print_function, unicode_literals

import binascii
import hashlib
import hmac
import os
import time
from email.utils import mktime_tz, parsedate_tz

from ...compat import keyword_options, to_bytes, to_text
from ...vendor import attr
from .constants import (
    DEVICE_HEADER,
    HEADER_OPTIONS,
    JSON_CONTENT_TYPE,
    NONCE_BYTES,
    NONCE_HEADER,
    SERVER_TIME_HEADER,
    SIGNATURE_HEADER,
    SIGNATURE_PREFIX,
    SIGNATURE_VERSION,
    STALE_REQUEST_STATUS,
    TIMESTAMP_HEADER,
)

_clock = {'offset': 0.0}


def sign(secret, body):
    digest = hmac.new(to_bytes(secret), to_bytes(body), hashlib.sha256).hexdigest()
    return SIGNATURE_PREFIX + digest


def request_path(url):
    rest = url.split('://', 1)[-1]
    slash = rest.find('/')
    path = rest[slash:] if slash >= 0 else '/'
    return path.split('#', 1)[0].split('?', 1)[0]


def new_nonce():
    return str(binascii.hexlify(os.urandom(NONCE_BYTES)).decode('ascii'))


def signed_message(method, path, timestamp, nonce, body, extra_headers=()):
    lines = [SIGNATURE_VERSION, method.upper(), path, str(timestamp), nonce]
    lines.extend(to_text(name).lower() + ':' + to_text(value) for name, value in extra_headers)
    return to_bytes('\n'.join(lines) + '\n') + to_bytes(body)


def server_time(headers):
    if not isinstance(headers, dict):
        return None
    values = {to_text(key).lower(): to_text(value).strip() for key, value in headers.items()}
    raw = values.get(SERVER_TIME_HEADER.lower(), '')
    if raw.isdigit():
        return float(raw)
    parsed = parsedate_tz(values.get('date', ''))
    return float(mktime_tz(parsed)) if parsed else None


def sync_clock(headers, now=None):
    server = server_time(headers)
    if server is None:
        return False
    _clock['offset'] = server - (now if now is not None else time.time())
    return True


def signed_headers(device_id, secret, body, user_agent, method, url, **options):
    options = keyword_options(options, HEADER_OPTIONS)
    now = options['now']
    timestamp = str(int(now if now is not None else time.time() + _clock['offset']))
    nonce = options['nonce'] or new_nonce()
    extra_headers = list(options['extra_headers'])
    message = signed_message(method, request_path(url), timestamp, nonce, body, extra_headers)

    headers = {
        'Content-Type': options['content_type'],
        'Accept': 'application/json',
        'User-Agent': user_agent,
        DEVICE_HEADER: device_id,
        TIMESTAMP_HEADER: timestamp,
        NONCE_HEADER: nonce,
        SIGNATURE_HEADER: sign(secret, message),
    }
    headers.update(extra_headers)
    return headers


@attr.s(frozen=True)
class SignedRequest(object):
    """One request `signed_request` signs and sends.

    `content_type` is JSON by default; `signed_body` is what the HMAC covers when it differs from the bytes on the wire
    (a multipart upload is signed over the raw file, which is what the server verifies after parsing the form);
    `extra_headers` are (name, value) pairs sent and covered by the signature (see signed_message).
    """

    method = attr.ib()
    url = attr.ib()
    device_id = attr.ib()
    secret = attr.ib()
    body = attr.ib()
    user_agent = attr.ib()
    content_type = attr.ib(default=JSON_CONTENT_TYPE)
    signed_body = attr.ib(default=None)
    extra_headers = attr.ib(default=())

    def covered_body(self):
        return self.body if self.signed_body is None else self.signed_body


def signed_request(transport, request, callback):
    """Signs and sends `request` (a SignedRequest); `callback(status, body, headers)` gets the answer. On a 428 with a
    usable server time it re-syncs the clock and re-signs once."""
    def send(may_retry):
        def done(status, response_body, response_headers):
            if status == STALE_REQUEST_STATUS and may_retry and sync_clock(response_headers):
                send(False)
                return
            callback(status, response_body, response_headers)

        headers = signed_headers(
            request.device_id,
            request.secret,
            request.covered_body(),
            request.user_agent,
            request.method,
            request.url,
            content_type=request.content_type,
            extra_headers=request.extra_headers,
        )
        transport.request(request.method, request.url, headers, request.body, done)

    send(True)

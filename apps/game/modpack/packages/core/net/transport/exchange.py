from __future__ import absolute_import, division, print_function, unicode_literals

from ...compat import to_native
from ...log import log
from ...vendor import six
from .constants import DEFAULT_MAX_RESPONSE_BYTES, DEFAULT_TIMEOUT_S, HTTP_WORKER, NETWORK_ERROR, SECURE_SCHEME
from .runner import BackgroundRunner
from .tls import is_allowed_url, tls_available, verified_context

_urlrequest = six.moves.urllib.request
HTTPError = six.moves.urllib.error.HTTPError


class ResponseTooLarge(IOError):
    pass


# A redirect would carry the signed X-Otmetki-* headers to another URL (even from https to http); the API never
# redirects, so a 3xx comes back as its own status instead of being followed.
class _RefuseRedirects(_urlrequest.HTTPRedirectHandler):

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _opener(url):
    if not is_allowed_url(url):
        return None
    if not url.lower().startswith(SECURE_SCHEME + ':'):
        return _urlrequest.build_opener(_RefuseRedirects)
    context = verified_context()
    if context is None:
        return None
    return _urlrequest.build_opener(_urlrequest.HTTPSHandler(context=context), _RefuseRedirects)


def read_capped(stream, max_bytes):
    data = stream.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ResponseTooLarge('response over %d bytes' % max_bytes)
    return data


def _headers_of(response):
    try:
        return {k: v for k, v in response.info().items()}
    except Exception:
        return {}


# Header names and values as the interpreter's `str`: Python 2's HTTP code must not mix unicode headers with a binary
# body.
def native_headers(headers):
    return {to_native(key): to_native(value) for key, value in (headers or {}).items()}


def _sized_headers(headers, body):
    if not hasattr(body, 'read'):
        return headers
    body.seek(0)
    sized = dict(headers or {})
    sized['Content-Length'] = str(len(body))
    return sized


def perform(method, url, headers, body, timeout, max_bytes=DEFAULT_MAX_RESPONSE_BYTES):
    url = to_native(url)
    opener = _opener(url)
    if opener is None:
        return NETWORK_ERROR, b'', {}
    request = _urlrequest.Request(url, data=body, headers=native_headers(_sized_headers(headers, body)))
    request.get_method = lambda: method
    try:
        response = opener.open(request, timeout=timeout)
        try:
            return response.getcode(), read_capped(response, max_bytes), _headers_of(response)
        finally:
            response.close()
    except HTTPError as error:
        return _error_reply(error, max_bytes)
    except Exception:
        return NETWORK_ERROR, b'', {}


def _error_reply(error, max_bytes):
    try:
        data = read_capped(error, max_bytes)
    except ResponseTooLarge:
        return NETWORK_ERROR, b'', {}
    except Exception:
        data = b''
    return error.code, data, _headers_of(error)


class SyncTransport(object):
    """Blocking transport for code that already runs on a worker thread (BackgroundRunner jobs)."""

    def __init__(self, timeout=DEFAULT_TIMEOUT_S, max_bytes=DEFAULT_MAX_RESPONSE_BYTES):
        self.timeout = timeout
        self.max_bytes = max_bytes

    def request(self, method, url, headers, body, callback):
        status, response_body, response_headers = perform(method, url, headers, body, self.timeout, self.max_bytes)
        callback(status, response_body, response_headers)

    def poll(self):
        return 0


# Requests on a BackgroundRunner thread; callbacks run on the thread that calls poll() (the game's).
class ThreadTransport(object):

    def __init__(self, timeout=DEFAULT_TIMEOUT_S, max_bytes=DEFAULT_MAX_RESPONSE_BYTES):
        self.timeout = timeout
        self.max_bytes = max_bytes
        self.runner = BackgroundRunner(HTTP_WORKER)
        self.tls_reported = False

    def request(self, method, url, headers, body, callback):
        timeout = self.timeout
        max_bytes = self.max_bytes

        def job():
            return perform(method, url, headers, body, timeout, max_bytes)

        def done(result):
            self._report_tls()
            if callback is not None:
                callback(*(result or (NETWORK_ERROR, b'', {})))

        self.runner.submit(job, done)

    def _report_tls(self):
        if self.tls_reported or tls_available() is not False:
            return
        self.tls_reported = True
        log('TLS verification is not available in this client: requests to the site are off')

    def poll(self):
        return self.runner.poll()

    def stop(self):
        self.runner.stop()

from __future__ import absolute_import, division, print_function, unicode_literals

from ...vendor import six
from .constants import LOOPBACK_HOSTS, PLAIN_SCHEME, SECURE_SCHEME

_urlparse = six.moves.urllib.parse.urlparse
_cache = {}


def _create_context(ssl_module):
    create = getattr(ssl_module, 'create_default_context', None)
    if create is None:
        return None
    try:
        context = create()
    except Exception:
        return None
    if context.verify_mode != ssl_module.CERT_REQUIRED or not context.check_hostname:
        return None
    return context


def _import_ssl():
    try:
        import ssl
    except ImportError:
        return None
    return ssl


def verified_context(ssl_module=None):
    """An SSLContext that checks the certificate chain and the host name, or None when this Python cannot make one
    (no `ssl` module, or one older than 2.7.9). The callers then refuse https instead of sending it unverified."""
    if ssl_module is not None:
        return _create_context(ssl_module)
    if 'context' not in _cache:
        _cache['context'] = _create_context(_import_ssl())
    return _cache['context']


def is_allowed_url(url):
    """https anywhere; plain http only to the developer's own machine."""
    try:
        parts = _urlparse(url)
        host = (parts.hostname or '').lower()
    except (TypeError, ValueError, AttributeError):
        return False
    if parts.username is not None or parts.password is not None or not host:
        return False
    if parts.scheme == SECURE_SCHEME:
        return True
    return parts.scheme == PLAIN_SCHEME and host in LOOPBACK_HOSTS

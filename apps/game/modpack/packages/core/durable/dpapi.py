from __future__ import absolute_import, division, print_function, unicode_literals

import base64
import binascii

from ..compat import string_types, to_bytes
from .constants import CRYPTPROTECT_UI_FORBIDDEN, DPAPI_ENTROPY


class SecretBox(object):
    """Seals a text secret for the current Windows user (DPAPI, CurrentUser scope, our entropy) as base64 text and
    opens it again; both give None when there is no DPAPI or the blob is not ours (another user or PC, damaged)."""

    def __init__(self, backend):
        self.backend = backend

    def available(self):
        return self.backend is not None

    def seal(self, secret):
        if self.backend is None or not isinstance(secret, string_types):
            return None
        blob = self.backend.protect(to_bytes(secret), DPAPI_ENTROPY)
        return None if blob is None else base64.b64encode(blob).decode('ascii')

    def open(self, sealed):
        if self.backend is None or not isinstance(sealed, string_types) or not sealed:
            return None
        try:
            blob = base64.b64decode(to_bytes(sealed))
        except (TypeError, ValueError, binascii.Error):
            return None
        data = self.backend.unprotect(blob, DPAPI_ENTROPY)
        if data is None:
            return None
        try:
            return data.decode('utf-8')
        except UnicodeDecodeError:
            return None


def _blob_type(ctypes):
    return type(str('DATA_BLOB'), (ctypes.Structure,), {
        str('_fields_'): [(str('cbData'), ctypes.c_uint32), (str('pbData'), ctypes.POINTER(ctypes.c_char))],
    })


class WindowsDpapi(object):
    """crypt32's CryptProtectData / CryptUnprotectData through ctypes; the output blob is freed with LocalFree."""

    def __init__(self, ctypes, crypt32, kernel32):
        self.ctypes = ctypes
        self.crypt32 = crypt32
        self.kernel32 = kernel32
        self.blob_type = _blob_type(ctypes)

    def protect(self, data, entropy):
        return self._call(self.crypt32.CryptProtectData, data, entropy)

    def unprotect(self, blob, entropy):
        return self._call(self.crypt32.CryptUnprotectData, blob, entropy)

    def _blob(self, data):
        ctypes = self.ctypes
        buffer = ctypes.create_string_buffer(data, len(data))
        return self.blob_type(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_char))), buffer

    def _call(self, function, data, entropy):
        ctypes = self.ctypes
        data_in, data_buffer = self._blob(data)
        entropy_in, entropy_buffer = self._blob(entropy)
        data_out = self.blob_type()
        try:
            done = function(
                ctypes.byref(data_in), None, ctypes.byref(entropy_in), None, None,
                CRYPTPROTECT_UI_FORBIDDEN, ctypes.byref(data_out),
            )
        except Exception:
            return None
        if not done:
            return None
        try:
            return ctypes.string_at(data_out.pbData, data_out.cbData)
        finally:
            self.kernel32.LocalFree(data_out.pbData)


def windows_dpapi():
    """The DPAPI backend of this Windows Python, or None elsewhere."""
    try:
        import ctypes
        return WindowsDpapi(ctypes, ctypes.windll.crypt32, ctypes.windll.kernel32)
    except (ImportError, AttributeError, OSError):
        return None


def secret_box():
    return SecretBox(windows_dpapi())

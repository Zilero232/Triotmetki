from __future__ import absolute_import, division, print_function, unicode_literals

import ctypes
import sys
import unittest

import _support  # noqa: F401
from otmetki.core.durable import SecretBox, secret_box
from otmetki.core.durable.constants import CRYPTPROTECT_UI_FORBIDDEN, DPAPI_ENTROPY
from otmetki.core.durable.dpapi import WindowsDpapi

SECRET = 'q' * 43


class RecordingBackend(object):

    def __init__(self):
        self.calls = []

    def protect(self, data, entropy):
        self.calls.append(('protect', entropy))
        return b'blob:' + data[::-1]

    def unprotect(self, blob, entropy):
        self.calls.append(('unprotect', entropy))
        return blob[len(b'blob:'):][::-1] if blob.startswith(b'blob:') else None


def blob_bytes(reference):
    blob = reference._obj
    return ctypes.string_at(blob.pbData, blob.cbData)


class StubCrypt32(object):
    """crypt32 as ctypes sees it: reads the input DATA_BLOB, fills the output one with a buffer it allocated."""

    def __init__(self, succeed=True):
        self.succeed = succeed
        self.calls = []
        self.buffers = []

    def _answer(self, name, data_in, entropy, flags, data_out, transform):
        self.calls.append((name, blob_bytes(entropy), flags))
        if not self.succeed:
            return 0
        result = transform(blob_bytes(data_in))
        buffer = ctypes.create_string_buffer(result, len(result))
        self.buffers.append(buffer)
        data_out._obj.cbData = len(result)
        data_out._obj.pbData = ctypes.cast(buffer, ctypes.POINTER(ctypes.c_char))
        return 1

    def CryptProtectData(self, data_in, description, entropy, reserved, prompt, flags, data_out):
        return self._answer('protect', data_in, entropy, flags, data_out, lambda data: b'P' + data)

    def CryptUnprotectData(self, data_in, description, entropy, reserved, prompt, flags, data_out):
        return self._answer('unprotect', data_in, entropy, flags, data_out, lambda data: data[1:])


class StubKernel32(object):

    def __init__(self):
        self.freed = 0

    def LocalFree(self, pointer):
        self.freed += 1


class SecretBoxTest(unittest.TestCase):

    def test_a_sealed_secret_opens_again(self):
        box = SecretBox(RecordingBackend())

        self.assertEqual(box.open(box.seal(SECRET)), SECRET)

    def test_the_seal_is_base64_text_without_the_secret(self):
        sealed = SecretBox(RecordingBackend()).seal(SECRET)

        self.assertNotIn(SECRET, sealed)
        self.assertEqual(sealed.strip('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='), '')

    def test_our_entropy_goes_to_both_calls(self):
        backend = RecordingBackend()
        box = SecretBox(backend)

        box.open(box.seal(SECRET))

        self.assertEqual(backend.calls, [('protect', DPAPI_ENTROPY), ('unprotect', DPAPI_ENTROPY)])

    def test_without_a_backend_nothing_is_sealed_or_opened(self):
        box = SecretBox(None)

        self.assertFalse(box.available())
        self.assertIsNone(box.seal(SECRET))
        self.assertIsNone(box.open('YWJj'))

    def test_garbage_does_not_open(self):
        box = SecretBox(RecordingBackend())

        self.assertEqual([box.open(value) for value in ('', None, 42, 'YWJj', '%%%')], [None] * 5)

    def test_a_blob_that_is_not_utf8_does_not_open(self):
        box = SecretBox(RecordingBackend())
        sealed = SecretBox(type(str('B'), (object,), {'protect': lambda self, data, entropy: b'blob:\xff\xfe'})())

        self.assertIsNone(box.open(sealed.seal(SECRET)))


class WindowsDpapiTest(unittest.TestCase):

    def dpapi(self, crypt32):
        self.kernel32 = StubKernel32()
        return WindowsDpapi(ctypes, crypt32, self.kernel32)

    def test_the_blob_goes_in_and_comes_out_through_data_blobs(self):
        crypt32 = StubCrypt32()
        dpapi = self.dpapi(crypt32)

        protected = dpapi.protect(b'secret', DPAPI_ENTROPY)

        self.assertEqual(protected, b'Psecret')
        self.assertEqual(dpapi.unprotect(protected, DPAPI_ENTROPY), b'secret')
        self.assertEqual(crypt32.calls, [
            ('protect', DPAPI_ENTROPY, CRYPTPROTECT_UI_FORBIDDEN),
            ('unprotect', DPAPI_ENTROPY, CRYPTPROTECT_UI_FORBIDDEN),
        ])

    def test_the_output_blob_is_freed(self):
        dpapi = self.dpapi(StubCrypt32())

        dpapi.protect(b'secret', DPAPI_ENTROPY)

        self.assertEqual(self.kernel32.freed, 1)

    def test_a_failed_call_gives_nothing(self):
        dpapi = self.dpapi(StubCrypt32(succeed=False))

        self.assertIsNone(dpapi.protect(b'secret', DPAPI_ENTROPY))
        self.assertEqual(self.kernel32.freed, 0)


@unittest.skipIf(sys.platform != 'win32', 'DPAPI is Windows only')
class RealDpapiTest(unittest.TestCase):

    def test_this_windows_user_seals_and_opens(self):
        box = secret_box()

        sealed = box.seal(SECRET)

        self.assertTrue(box.available())
        self.assertEqual(box.open(sealed), SECRET)

    def test_another_entropy_does_not_open(self):
        backend = secret_box().backend
        blob = backend.protect(SECRET.encode('ascii'), b'other-entropy')

        self.assertIsNone(backend.unprotect(blob, DPAPI_ENTROPY))


if __name__ == '__main__':
    unittest.main()

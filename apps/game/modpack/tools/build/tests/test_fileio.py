# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import hashlib
import io
import json
import os
import shutil
import sys
import tempfile
import unittest

import _support  # noqa: F401

BUILD_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BUILD_DIR not in sys.path:
    sys.path.insert(0, BUILD_DIR)

import fileio  # noqa: E402

TEXT = 'один\nдва\n'


class FileIoTest(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp(prefix='otmetki-fileio-')
        self.addCleanup(shutil.rmtree, self.root)

    def test_write_text_creates_the_folder_and_keeps_lf(self):
        path = os.path.join(self.root, 'nested', 'deeper', 'out.md')

        returned = fileio.write_text(path, TEXT)

        self.assertEqual(returned, path)
        with io.open(path, 'rb') as handle:
            self.assertEqual(handle.read(), TEXT.encode('utf-8'))

    def test_write_json_keeps_non_ascii_and_ends_with_a_newline(self):
        value = {'title': 'Три отметки', 'size': 2}

        path = fileio.write_json(os.path.join(self.root, 'value.json'), value)

        with io.open(path, encoding='utf-8') as handle:
            text = handle.read()
        self.assertIn('Три отметки', text)
        self.assertTrue(text.endswith('}\n'))
        self.assertEqual(json.loads(text), value)

    def test_json_text_leaves_no_space_at_the_end_of_a_line(self):
        text = fileio.json_text({'items': [1, 2], 'name': 'x'})

        self.assertEqual([line for line in text.splitlines() if line != line.rstrip()], [])

    def test_json_text_sorts_keys_on_request(self):
        text = fileio.json_text({'b': 1, 'a': 2}, sort_keys=True)

        self.assertLess(text.index('"a"'), text.index('"b"'))

    def test_read_json_reads_what_write_json_wrote(self):
        value = {'title': 'Три отметки', 'list': [1, None]}

        path = fileio.write_json(os.path.join(self.root, 'value.json'), value)

        self.assertEqual(fileio.read_json(path), value)

    def test_write_bytes_creates_the_folder_and_read_bytes_reads_them_back(self):
        path = os.path.join(self.root, 'nested', 'blob.bin')

        fileio.write_bytes(path, b'\x00\xff')

        self.assertEqual(fileio.read_bytes(path), b'\x00\xff')

    def test_sha256_matches_hashlib_over_several_chunks(self):
        data = os.urandom(fileio.CHUNK_SIZE * 2 + 17)
        path = os.path.join(self.root, 'blob.bin')
        with open(path, 'wb') as handle:
            handle.write(data)

        digest = fileio.sha256(path)

        self.assertEqual(digest, hashlib.sha256(data).hexdigest())


if __name__ == '__main__':
    unittest.main()

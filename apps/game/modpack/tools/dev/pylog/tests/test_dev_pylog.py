# -*- coding: utf-8 -*-
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import shutil
import sys
import tempfile
import unittest

TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

from dev import pylog  # noqa: E402

LOG = [
    '2026-10-05 12:00:00.000: INFO: [OTMETKI] app started',
    '2026-10-05 12:00:00.100: INFO: [Gameface] page loaded',
    '2026-10-05 12:00:01.000: INFO: [OTMETKI] error in on_battle',
    'Traceback (most recent call last):',
    '  File "scripts/client/gui/mods/otmetki/core/hooks/__init__.py", line 10, in run',
    "KeyError: 'damage'",
    '2026-10-05 12:00:02.000: ERROR: (scripts/client/gui/battle_control/ammo_ctrl.py, 1021) Shell is not found.',
    '  File "scripts/client/gui/mods/mod_otmetki_damage_log.py", line 3, in <module>',
]


class OurLinesTest(unittest.TestCase):

    def test_keeps_our_lines_and_the_traceback_after_them(self):
        kept = pylog.OurLines().filter(LOG)

        self.assertEqual(kept, [LOG[0], LOG[2], LOG[3], LOG[4], LOG[5], LOG[7]])

    def test_keep_all_keeps_every_line(self):
        self.assertEqual(pylog.OurLines(keep_all=True).filter(LOG), LOG)

    def test_an_indented_client_line_after_a_foreign_one_is_dropped(self):
        lines = ['2026-10-05: ERROR: client failure', '  File "scripts/client/gui/battle.py", line 1']

        self.assertEqual(pylog.OurLines().filter(lines), [])


class ReadFromTest(unittest.TestCase):

    def setUp(self):
        self.folder = tempfile.mkdtemp()
        self.path = os.path.join(self.folder, 'python.log')
        self.reader = pylog.LogReader(self.path)

    def tearDown(self):
        shutil.rmtree(self.folder, ignore_errors=True)

    def append(self, data):
        with open(self.path, 'ab') as handle:
            handle.write(data)

    def test_a_letter_split_between_two_reads_comes_out_whole(self):
        letter = u'Ж'.encode('utf-8')
        self.append(b'a' + letter[:1])
        first = self.reader.read()
        self.append(letter[1:] + b'\n')

        second = self.reader.read()

        self.assertEqual(first + second, u'aЖ\n')

    def test_a_file_the_client_started_again_is_read_from_its_start(self):
        self.append(b'old line\n')
        self.reader.read()
        os.remove(self.path)
        self.append(b'new\n')

        self.assertEqual(self.reader.read(), u'new\n')


class SafeOutputTest(unittest.TestCase):

    def test_a_character_the_console_cannot_show_is_replaced(self):
        buffer = io.BytesIO()

        pylog.safe_output(buffer, 'cp1251').write(u'� →\n')

        self.assertEqual(buffer.getvalue(), b'? ?\n')

    def test_the_utf8_code_page_writes_utf8(self):
        buffer = io.BytesIO()

        pylog.safe_output(buffer, 'cp65001').write(u'танк\n')

        self.assertEqual(buffer.getvalue(), u'танк\n'.encode('utf-8'))

    def test_an_unknown_console_encoding_falls_back_to_ascii(self):
        buffer = io.BytesIO()

        pylog.safe_output(buffer, 'no-such-codec').write(u'тank\n')

        self.assertEqual(buffer.getvalue(), b'?ank\n')


if __name__ == '__main__':
    unittest.main()

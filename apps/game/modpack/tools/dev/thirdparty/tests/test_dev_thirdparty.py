import hashlib
import os
import shutil
import sys
import tempfile
import unittest
from types import SimpleNamespace

TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

from dev import thirdparty  # noqa: E402
from dev.testing import write  # noqa: E402

CONTENT = 'gameface package'
GAMEFACE = SimpleNamespace(
    id='openwg_gameface',
    package_id='net.openwg.gameface',
    file='net.openwg.gameface_1.2.2.mtmod',
    source_url='https://example.invalid/net.openwg.gameface_1.2.2.mtmod',
    sha256=hashlib.sha256(CONTENT.encode('utf-8')).hexdigest(),
    size=len(CONTENT),
)


class CopiesTest(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp(prefix='otmetki-dev-thirdparty-')

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_a_copy_is_named_after_the_package_id(self):
        self.assertTrue(thirdparty.is_copy_of(GAMEFACE, 'NET.OpenWG.Gameface_1.1.0.wotmod'))
        self.assertTrue(thirdparty.is_copy_of(GAMEFACE, 'net.openwg.gameface.mtmod'))

    def test_a_longer_package_id_is_not_a_copy(self):
        self.assertFalse(thirdparty.is_copy_of(GAMEFACE, 'net.openwg.gameface.extra_1.0.mtmod'))
        self.assertFalse(thirdparty.is_copy_of(GAMEFACE, 'net.openwg.gameface_1.2.2.zip'))

    def test_finds_a_copy_in_a_subfolder_but_not_in_the_dev_folder(self):
        own = write(os.path.join(self.root, 'someone', 'net.openwg.gameface_1.2.2.mtmod'), CONTENT)
        dev_folder = os.path.join(self.root, 'otmetki-dev')
        write(os.path.join(dev_folder, 'net.openwg.gameface_1.2.2.mtmod'), CONTENT)

        self.assertEqual(thirdparty.find_copies(self.root, GAMEFACE, skip_dir=dev_folder), [own])

    def test_looks_four_levels_deep_at_most(self):
        write(os.path.join(self.root, 'a', 'b', 'c', 'd', 'net.openwg.gameface_1.2.2.mtmod'), CONTENT)
        found = write(os.path.join(self.root, 'a', 'b', 'c', 'net.openwg.gameface_1.2.2.mtmod'), CONTENT)

        self.assertEqual(thirdparty.find_copies(self.root, GAMEFACE), [found])


class FetchTest(unittest.TestCase):

    def setUp(self):
        self.cache = tempfile.mkdtemp(prefix='otmetki-dev-cache-')

    def tearDown(self):
        shutil.rmtree(self.cache, ignore_errors=True)

    def test_a_cached_file_with_the_pinned_hash_is_used(self):
        cached = write(os.path.join(self.cache, GAMEFACE.file), CONTENT)

        self.assertEqual(thirdparty.fetch(GAMEFACE, self.cache, offline=True), cached)

    def test_a_cached_file_with_another_hash_is_refused_and_dropped(self):
        cached = write(os.path.join(self.cache, GAMEFACE.file), 'changed upload!!')

        with self.assertRaises(thirdparty.ThirdPartyError):
            thirdparty.fetch(GAMEFACE, self.cache, offline=True)

        self.assertFalse(os.path.exists(cached))

    def test_offline_without_a_cached_file_is_an_error(self):
        with self.assertRaises(thirdparty.ThirdPartyError):
            thirdparty.fetch(GAMEFACE, self.cache, offline=True)


if __name__ == '__main__':
    unittest.main()

import os
import shutil
import sys
import tempfile
import unittest

TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

from dev import client, manager  # noqa: E402
from dev.testing import lesta_client, write  # noqa: E402

OWNED = ('net.triotmetki.*.mtmod', 'net.triotmetki.*.wotmod', 'otmetki.*.mtmod', 'otmetki.*.wotmod')
# The key the manager (state::client_key) gave D:\Games\Tanki on a live install.
LIVE_CLIENT = 'D:\\Games\\Tanki'
LIVE_KEY = '035e51b81207483f'


class ClientKeyTest(unittest.TestCase):

    def test_matches_the_managers_key(self):
        self.assertEqual(manager.client_key(LIVE_CLIENT), LIVE_KEY)

    def test_ignores_ascii_case_and_a_trailing_backslash(self):
        self.assertEqual(manager.client_key('d:\\games\\TANKI\\'), LIVE_KEY)


class FindInstallTest(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp(prefix='otmetki-dev-manager-')
        self.client = client.inspect(lesta_client(self.root, 'Tanki'), 'manual')
        self.environ = {'OTMETKI_STATE_ROOT': os.path.join(self.root, 'state')}

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_a_clean_client_has_no_manager_install(self):
        self.assertFalse(manager.find_install(self.environ, self.client, OWNED).present)

    def test_sees_our_packages_lying_in_mods_version(self):
        package = write(os.path.join(self.client.mods_dir, 'net.triotmetki.core_0.7.0.mtmod'), '')

        found = manager.find_install(self.environ, self.client, OWNED)

        self.assertEqual(found.files, (package,))

    def test_sees_the_companion_under_its_otmetki_id(self):
        write(os.path.join(self.client.mods_dir, 'otmetki.companion_0.7.0.mtmod'), '')

        self.assertTrue(manager.find_install(self.environ, self.client, OWNED).present)

    def test_leaves_other_mods_and_subfolders_out(self):
        write(os.path.join(self.client.mods_dir, 'net.openwg.gameface_1.2.2.mtmod'), '')
        write(os.path.join(self.client.mods_dir, 'otmetki-dev', 'net.triotmetki.core_0.7.0.mtmod'), '')

        self.assertFalse(manager.find_install(self.environ, self.client, OWNED).present)

    def test_sees_the_managers_manifest_without_packages(self):
        manifest = write(manager.manifest_path(self.environ, self.client.path), '[install]\n')

        found = manager.find_install(self.environ, self.client, OWNED)

        self.assertEqual(found.manifest, manifest)


if __name__ == '__main__':
    unittest.main()

from __future__ import absolute_import, division, print_function, unicode_literals

import json
import os
import shutil
import sys
import tempfile
import unittest

TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

from dev import deploy  # noqa: E402
from dev.testing import write  # noqa: E402

DETAILS = {'client': 'C:\\Games\\Tanki', 'packages': ['core']}


class DeployTest(unittest.TestCase):

    def setUp(self):
        self.root = tempfile.mkdtemp(prefix='otmetki-dev-deploy-')
        self.mods_dir = os.path.join(self.root, 'mods', '1.45.0.0')
        self.folder = deploy.dev_dir(self.mods_dir)
        self.core = write(os.path.join(self.root, 'build', 'net.triotmetki.core_0.7.0.mtmod'), 'core v1')
        self.panel = write(os.path.join(self.root, 'build', 'net.triotmetki.marks_panel_0.6.0.mtmod'), 'panel')

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def installed(self):
        return sorted(os.listdir(self.folder))

    def sync(self, *sources):
        return deploy.sync(self.folder, dict((os.path.basename(path), path) for path in sources), DETAILS)

    def test_installs_into_its_own_subfolder_with_a_manifest(self):
        self.sync(self.core, self.panel)

        self.assertEqual(self.installed(), [
            'net.triotmetki.core_0.7.0.mtmod',
            'net.triotmetki.marks_panel_0.6.0.mtmod',
            deploy.MANIFEST_NAME,
        ])

    def test_the_manifest_records_every_file_with_its_hash(self):
        _, files = self.sync(self.core)

        self.assertEqual(deploy.read_manifest(self.folder)['files'], files)

    def test_an_unchanged_package_is_not_copied_again(self):
        self.sync(self.core)

        plan, _ = self.sync(self.core)

        self.assertEqual(plan.keep, ['net.triotmetki.core_0.7.0.mtmod'])

    def test_a_changed_package_is_copied_again(self):
        self.sync(self.core)
        write(self.core, 'core v2')

        plan, _ = self.sync(self.core)

        self.assertEqual([name for name, _ in plan.copy], ['net.triotmetki.core_0.7.0.mtmod'])

    def test_a_package_dropped_from_the_selection_is_removed(self):
        self.sync(self.core, self.panel)

        self.sync(self.core)

        self.assertNotIn('net.triotmetki.marks_panel_0.6.0.mtmod', self.installed())

    def test_never_touches_a_file_it_did_not_write(self):
        foreign = write(os.path.join(self.folder, 'someone.else_1.0.mtmod'), 'theirs')
        self.sync(self.core)

        deploy.uninstall(self.folder)

        self.assertTrue(os.path.isfile(foreign))

    def test_never_touches_the_mods_folder_around_it(self):
        user_mod = write(os.path.join(self.mods_dir, 'net.triotmetki.core_0.1.0.mtmod'), 'manager')
        self.sync(self.core)

        deploy.uninstall(self.folder)

        self.assertTrue(os.path.isfile(user_mod))

    def test_uninstall_removes_the_folder_when_nothing_else_is_left(self):
        self.sync(self.core, self.panel)

        deploy.uninstall(self.folder)

        self.assertFalse(os.path.exists(self.folder))

    def test_uninstall_leaves_a_file_changed_by_hand_and_keeps_tracking_it(self):
        self.sync(self.core)
        write(os.path.join(self.folder, 'net.triotmetki.core_0.7.0.mtmod'), 'edited')

        plan = deploy.uninstall(self.folder)

        self.assertEqual(plan.changed, ['net.triotmetki.core_0.7.0.mtmod'])
        self.assertEqual(list(deploy.read_manifest(self.folder)['files']), ['net.triotmetki.core_0.7.0.mtmod'])

    def test_uninstall_without_a_dev_install_does_nothing(self):
        self.assertIsNone(deploy.uninstall(self.folder))

    def test_refuses_a_manifest_it_did_not_write(self):
        write(deploy.manifest_file(self.folder), json.dumps({'files': {}}))

        with self.assertRaises(deploy.DeployError):
            deploy.uninstall(self.folder)

    def test_refuses_a_manifest_that_points_outside_the_folder(self):
        manifest = {'tool': deploy.MANIFEST_TOOL, 'files': {'..\\..\\net.triotmetki.core_0.1.0.mtmod': 'x'}}
        write(deploy.manifest_file(self.folder), json.dumps(manifest))

        with self.assertRaises(deploy.DeployError):
            deploy.uninstall(self.folder)


class PlainNameTest(unittest.TestCase):

    def test_accepts_a_bare_package_name(self):
        self.assertTrue(deploy.is_plain_name('net.triotmetki.core_0.7.0.mtmod'))

    def test_rejects_paths_parents_and_the_manifest(self):
        for name in ('a/b.mtmod', 'a\\b.mtmod', '..', '', deploy.MANIFEST_NAME):
            self.assertFalse(deploy.is_plain_name(name), name)


if __name__ == '__main__':
    unittest.main()

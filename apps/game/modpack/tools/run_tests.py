"""Run every modpack unittest suite: packages/*/tests, features/*/tests and tools/**/tests.

Runs on Python 2.7, the game client's own interpreter, which also runs all of the host tooling
(the dependencies in tools/requirements.txt).
Usage: python tools/run_tests.py [-v]   (Python 2.7)
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import sys
import unittest

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
MODPACK_DIR = os.path.dirname(TOOLS_DIR)
sys.path.insert(0, os.path.join(TOOLS_DIR, 'testing'))

import _support  # noqa: E402  (maps the repo layout onto the otmetki package)


def is_tests_dir(directory):
    """A tools/**/tests folder or a folder right inside one."""
    parent_name = os.path.basename(os.path.dirname(directory))
    return parent_name == 'tests' or os.path.basename(directory) == 'tests'


def has_test_modules(directory):
    if not os.path.isdir(directory):
        return False
    return any(name.startswith('test_') for name in os.listdir(directory))


def tools_test_dirs():
    for directory, children, _ in os.walk(TOOLS_DIR):
        children[:] = sorted(child for child in children if child != '__pycache__')
        if is_tests_dir(directory):
            yield directory


def test_dirs():
    dirs = [os.path.join(base, 'tests') for base in _support.source_dirs()]
    dirs.extend(tools_test_dirs())
    return [directory for directory in dirs if has_test_modules(directory)]


def test_module_names(directory):
    for name in sorted(os.listdir(directory)):
        if name.startswith('test_') and name.endswith('.py'):
            yield name


def find_duplicate_module(directories):
    """unittest imports every test module by its bare name, so two with one name would shadow each other."""
    seen = {}
    for directory in directories:
        for name in test_module_names(directory):
            if name in seen:
                return 'duplicate test module name %s in %s and %s\n' % (name, seen[name], directory)
            seen[name] = directory
    return None


def main(argv):
    if sys.version_info[:2] != (2, 7):
        sys.stderr.write('the modpack runs on Python 2.7, the game client interpreter (mise: conda:python 2.7.18)\n')
        return 2
    directories = test_dirs()
    duplicate = find_duplicate_module(directories)
    if duplicate:
        sys.stderr.write(duplicate)
        return 2

    suite = unittest.TestSuite()
    for directory in directories:
        suite.addTests(unittest.TestLoader().discover(directory, pattern='test_*.py', top_level_dir=directory))
    verbosity = 2 if '-v' in argv else 1
    result = unittest.TextTestRunner(verbosity=verbosity).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

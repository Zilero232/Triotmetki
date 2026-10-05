"""Run every modpack unittest suite: packages/*/tests, features/*/tests and tools/**/tests.

Works on Python 3 and on Python 2.7 with no third-party packages; `pytest` runs the same tests
(see pyproject.toml). The build tool's and the dev loop's own tests need Python 3 and are left out on Python 2.7.
Usage: python tools/run_tests.py [-v]
"""
import os
import sys
import unittest

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
MODPACK_DIR = os.path.dirname(TOOLS_DIR)
PY3 = sys.version_info[0] >= 3
PYTHON3_TOOLS = ('build', 'dev')
sys.path.insert(0, os.path.join(TOOLS_DIR, 'testing'))

import _support  # noqa: E402  (maps the repo layout onto the otmetki package)


def python3_only(directory):
    """The build tooling (tools/build/**) and the dev loop (tools/dev/**) need Python 3."""
    return directory.startswith(tuple(os.path.join(TOOLS_DIR, name) for name in PYTHON3_TOOLS))


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
        is_runnable = PY3 or not python3_only(directory)
        if is_tests_dir(directory) and is_runnable:
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

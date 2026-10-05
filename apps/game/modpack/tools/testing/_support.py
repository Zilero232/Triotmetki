"""Shared test helpers. Importing it maps the repo layout onto the in-game package tree:

    packages/core       -> otmetki.core       (gui/mods/otmetki/core in the client)
    packages/companion  -> otmetki.companion
    features/<id>       -> otmetki.features.<id>

so tests import the sources exactly as the client does, with their relative imports intact.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import json
import os
import shutil
import sys
import tempfile
import types

TESTING_DIR = os.path.dirname(os.path.abspath(__file__))
MODPACK_DIR = os.path.dirname(os.path.dirname(TESTING_DIR))
PACKAGES_DIR = os.path.join(MODPACK_DIR, 'packages')
FEATURES_DIR = os.path.join(MODPACK_DIR, 'features')
CONTRACT_DIR = os.path.join(MODPACK_DIR, 'contract')
FIXTURES_DIR = os.path.join(PACKAGES_DIR, 'companion', 'tests', 'fixtures')
ROOT_PACKAGE = 'otmetki'
VENDOR_DIR = os.path.join(PACKAGES_DIR, 'core', 'vendor')


# The client's own site module (res/scripts/common/bw_site.py) switches the default encoding to UTF-8 at start-up, so
# implicit byte/text mixing in the game decodes UTF-8 (the client's localized strings are UTF-8 bytes); the tests run
# the sources under the same rule.
def _match_client_encoding():
    if sys.version_info[0] == 2 and sys.getdefaultencoding() != 'utf-8':
        reload(sys)
        sys.setdefaultencoding('utf-8')


_match_client_encoding()


def _install_root_package():
    if ROOT_PACKAGE in sys.modules:
        return
    root = types.ModuleType(str(ROOT_PACKAGE))
    root.__path__ = [PACKAGES_DIR, MODPACK_DIR]
    sys.modules[ROOT_PACKAGE] = root


_install_root_package()


def _isolate_durable_dir():
    """The app mirrors its settings into %APPDATA%\\TriOtmetki (core.durable); tests get a throwaway one."""
    directory = tempfile.mkdtemp(prefix='otmetki-appdata-')
    os.environ['APPDATA'] = directory
    try:
        import atexit  # the portable Python 2.7 used for the py27 run ships without it
    except ImportError:
        return
    atexit.register(shutil.rmtree, directory, True)


_isolate_durable_dir()


# Python 2 sets every global of a module to None once the module object is freed, so a function imported from a module
# that a test later drops from sys.modules (to reload it under fresh stubs) would find its globals gone. The dropped
# modules are kept here for the rest of the run.
_DROPPED_MODULES = []


def drop_modules(names):
    """Removes the named modules from sys.modules, keeping them alive (see _DROPPED_MODULES)."""
    for name in list(names):
        module = sys.modules.pop(name, None)
        if module is not None:
            _DROPPED_MODULES.append(module)


def forget_modules(prefixes):
    """Drops every loaded module whose name starts with one of `prefixes` (a string or a tuple)."""
    drop_modules([name for name in sys.modules if name.startswith(prefixes)])


# Python 2 resolves a stubbed client module the way the client's real packages allow, not straight from sys.modules:
# `import a.b.c` needs `a` and `a.b` loaded, and `from a.b import c` reads the attribute `c` of `a.b`.
def stub_parents(name):
    """Adds an empty package for every missing parent of `name`; returns the names it added."""
    parts = name.split('.')
    added = []
    for index in range(1, len(parts)):
        parent = '.'.join(parts[:index])
        if parent not in sys.modules:
            package = types.ModuleType(str(parent))
            package.__path__ = []
            sys.modules[parent] = package
            added.append(parent)
        link_to_parent(parent)
    return added


def link_to_parent(name):
    """Sets the loaded module `name` as an attribute of its loaded parent package, as an import would."""
    parent, _, child = name.rpartition('.')
    if parent in sys.modules and name in sys.modules:
        setattr(sys.modules[parent], str(child), sys.modules[name])


def source_dirs():
    """Every directory of game-client sources: core, companion and each feature."""
    dirs = [os.path.join(PACKAGES_DIR, name) for name in sorted(os.listdir(PACKAGES_DIR))]
    dirs += [os.path.join(FEATURES_DIR, name) for name in sorted(os.listdir(FEATURES_DIR))]
    return [path for path in dirs if os.path.isdir(path) and not os.path.basename(path).startswith(('_', '.'))]


def feature_ids():
    return [os.path.basename(path) for path in source_dirs() if os.path.dirname(path) == FEATURES_DIR]


def _py_files(base, skipped):
    for directory, dirs, files in os.walk(base):
        dirs[:] = sorted(d for d in dirs if d not in skipped and os.path.join(directory, d) not in skipped)
        for name in sorted(files):
            if name.endswith('.py'):
                yield os.path.join(directory, name)


def source_files():
    """The mod's own game-client .py sources (tests and the vendored libraries excluded), the entry
    scripts and features/__init__.py included."""
    yield os.path.join(FEATURES_DIR, '__init__.py')
    for base in source_dirs():
        for path in _py_files(base, ('tests', '__pycache__', VENDOR_DIR)):
            yield path


def vendor_files():
    """The vendored third-party .py files (packages/core/vendor): shipped, but not held to the mod's style."""
    return list(_py_files(VENDOR_DIR, ('__pycache__',)))


def load_json(path):
    with io.open(path, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def fixture(name):
    return load_json(os.path.join(FIXTURES_DIR, name))


def battle_results():
    data = fixture('battle_results_random.json')
    personal = data['personal']
    for key in list(personal.keys()):
        if key != 'avatar':
            personal[int(key)] = personal.pop(key)
    return data


def schema(name):
    return load_json(os.path.join(CONTRACT_DIR, name))


def schema_validator(name, definition=None):
    try:
        import jsonschema
    except ImportError:
        return None
    root = schema(name)
    if definition is None:
        return jsonschema.Draft7Validator(root)
    target = dict(root['definitions'][definition], definitions=root['definitions'])
    return jsonschema.Draft7Validator(target)


def translator(strings, language='ru'):
    """A translator over a feature's own STRINGS (the tests' stand-in for app.translate)."""
    from otmetki.core.i18n import Catalog, Translator
    return Translator(Catalog(strings), language)


class FakeTransport(object):

    def __init__(self):
        self.requests = []

    def request(self, method, url, headers, body, callback):
        self.requests.append({
            'method': method,
            'url': url,
            'headers': headers,
            'body': body,
            'callback': callback,
        })

    def respond(self, status, body=b'', headers=None, index=-1):
        request = self.requests[index]
        request['callback'](status, body, headers or {})

    def poll(self):
        return 0


WIDGET_FIXTURES_DIR = os.path.join(
    MODPACK_DIR, 'ui-web', 'src', 'shared', 'api', 'hud-protocol', '_tests', 'fixtures', 'widgets',
)


def _write_widget_fixture(path, payload):
    text = json.dumps(payload, sort_keys=True, indent=2, ensure_ascii=False) + '\n'
    if not isinstance(text, type(u'')):
        text = text.decode('utf-8')
    if not os.path.isdir(WIDGET_FIXTURES_DIR):
        os.makedirs(WIDGET_FIXTURES_DIR)
    with io.open(path, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(text)


def widget_fixture(kind, payload):
    """Checks `payload` (a panel's widget, `core.hud.widget`) against the page's fixture of `kind`, which the ui-web
    tests render; OTMETKI_UPDATE_FIXTURES=1 rewrites it. Returns whether they match."""
    path = os.path.join(WIDGET_FIXTURES_DIR, '%s.sample.json' % kind)
    if os.environ.get('OTMETKI_UPDATE_FIXTURES') == '1':
        _write_widget_fixture(path, payload)
    if not os.path.isfile(path):
        return False
    return load_json(path) == json.loads(json.dumps(payload))

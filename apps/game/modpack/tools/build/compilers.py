"""Compiling the sources to CPython 2.7 bytecode.

The production client loads only `mod_*.pyc` (it reads `.py` only in development mode), so release
packages must ship `.pyc`. Two backends, tried in this order by `--compiler auto`:

- `owg`: OpenWG `owg_python_compiler` (https://gitlab.com/openwg/owg-python-compiler). A standalone
  C++ tool, no Python 2.7 needed, reproducible output (fixed header timestamp, stable co_filename).
  Found through --owg-compiler, $OWG_PYTHON_COMPILER, then `owg_python_compiler` on PATH.
- `py27`: a local Python 2.7 interpreter running py_compile.
  Found through --python27, $OTMETKI_PY27, $PYTHON27, `py -2.7`, python2.7, python2, C:\\Python27.

Both put the in-package path (scripts/client/gui/mods/...) into co_filename so tracebacks in
python.log point at the package, not at the build machine.
"""
import json
import os
import shutil
import subprocess
import sys

from archive import ZIP_EPOCH

OWG_NAMES = ('owg_python_compiler', 'owg_python_compiler.exe')
PY27_CANDIDATES = (
    ['py', '-2.7'],
    ['python2.7'],
    ['python2'],
    ['C:\\Python27\\python.exe'],
)

# py_compile stamps the source's mtime into the .pyc header (bytes 4-8 on Python 2, 8-12 after PEP 552); the script
# overwrites it with ZIP_EPOCH (argv[1]) so a package is the same bytes on every build, as owg's --timestamp does.
PY27_COMPILE_SCRIPT = r'''
import json, py_compile, struct, sys
jobs = json.loads(sys.stdin.read())
offset = 4 if sys.version_info[0] == 2 else 8
for src, dst, dfile in jobs:
    py_compile.compile(src, cfile=dst, dfile=dfile, doraise=True)
    with open(dst, 'r+b') as handle:
        handle.seek(offset)
        handle.write(struct.pack('<I', int(sys.argv[1])))
print('compiled %d files' % len(jobs))
'''


def _runs(command, args, expect=None):
    try:
        output = subprocess.run(command + args, capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return False
    if output.returncode != 0:
        return False
    return expect is None or output.stdout.strip() == expect


def find_owg(explicit=None):
    candidates = []
    if explicit:
        candidates.append(explicit)
    if os.environ.get('OWG_PYTHON_COMPILER'):
        candidates.append(os.environ['OWG_PYTHON_COMPILER'])
    for name in OWG_NAMES:
        found = shutil.which(name)
        if found:
            candidates.append(found)
    for candidate in candidates:
        if _runs([candidate], ['version']):
            return [candidate]
    return None


def find_python27(explicit=None):
    candidates = []
    if explicit:
        candidates.append([explicit])
    for env in ('OTMETKI_PY27', 'PYTHON27'):
        if os.environ.get(env):
            candidates.append([os.environ[env]])
    candidates.extend(PY27_CANDIDATES)
    for command in candidates:
        if _runs(command, ['-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], expect='2.7'):
            return command
    return None


def in_package_path(archive_path):
    """co_filename for a file: its path inside res/, e.g. scripts/client/gui/mods/mod_otmetki.py."""
    return archive_path[len('res/'):]


def compile_py27(python27, entries, staging):
    jobs = []
    compiled = []
    for path, archive_path in entries:
        target = os.path.join(staging, archive_path.replace('/', os.sep) + 'c')
        os.makedirs(os.path.dirname(target), exist_ok=True)
        jobs.append([path, target, in_package_path(archive_path)])
        compiled.append((target, archive_path + 'c'))
    result = subprocess.run(
        python27 + ['-c', PY27_COMPILE_SCRIPT, str(ZIP_EPOCH)],
        input=json.dumps(jobs),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stdout + result.stderr)
        raise SystemExit('Python 2.7 compilation failed')
    print(result.stdout.strip())
    return compiled


def compile_owg(owg, entries, staging):
    """Stage the sources as res/scripts/..., compile the scripts/ tree with a fixed timestamp and
    `--filename-root scripts`, so co_filename is scripts/client/gui/mods/<path> (UNVERIFIED on a
    live client: check a traceback in python.log after the first owg-built release)."""
    source_root = os.path.join(staging, 'src')
    target_root = os.path.join(staging, 'out')
    for path, archive_path in entries:
        target = os.path.join(source_root, in_package_path(archive_path).replace('/', os.sep))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copyfile(path, target)
    command = owg + [
        'compile',
        '--source', os.path.join(source_root, 'scripts'),
        '--target', os.path.join(target_root, 'scripts'),
        '--filename-root', 'scripts',
        '--timestamp', str(ZIP_EPOCH),
        '--strict',
        '--quiet',
    ]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stdout + result.stderr)
        raise SystemExit('owg_python_compiler failed')
    compiled = []
    for path, archive_path in entries:
        target = os.path.join(target_root, in_package_path(archive_path).replace('/', os.sep) + 'c')
        if not os.path.isfile(target):
            raise SystemExit('owg_python_compiler did not write %s' % target)
        compiled.append((target, archive_path + 'c'))
    print('compiled %d files with owg_python_compiler' % len(compiled))
    return compiled


def select(choice, owg_path=None, python27_path=None):
    """(name, compile function) for the chosen backend, or (None, None) when none is available."""
    if choice in ('auto', 'owg'):
        owg = find_owg(owg_path)
        if owg is not None:
            print('compiler: owg_python_compiler (%s)' % owg[0])
            return 'owg', lambda entries, staging: compile_owg(owg, entries, staging)
        if choice == 'owg':
            raise SystemExit('owg_python_compiler not found; pass --owg-compiler or set OWG_PYTHON_COMPILER')
    if choice in ('auto', 'py27'):
        python27 = find_python27(python27_path)
        if python27 is not None:
            print('compiler: Python 2.7 (%s)' % ' '.join(python27))
            return 'py27', lambda entries, staging: compile_py27(python27, entries, staging)
        if choice == 'py27':
            raise SystemExit('Python 2.7 not found; pass --python27 or set OTMETKI_PY27')
    return None, None

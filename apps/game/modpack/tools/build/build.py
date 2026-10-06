"""Build the Three Marks packages.

Usage:
    python apps/game/modpack/tools/build/build.py [--single] [--wg] [--require-pyc]
        [--compiler auto|owg|py27] [--owg-compiler PATH] [--python27 PATH] [--out DIR] [--install-dir DIR]

Default: one `.mtmod` per package (core, companion, each feature) in apps/game/modpack/dist, each with
meta.xml naming its dependencies. `--single` builds the pre-split single package instead
(otmetki.<version>.mtmod, id otmetki.companion) into the `single/` subfolder of --out: it is the union of the
split packages and shares the companion's id, so the two sets never sit in one folder a player copies from.
`--wg` writes `.wotmod` for WG clients.

The production client loads only compiled `mod_*.pyc`: without a compiler the packages carry `.py`
sources and only load in a development client. Release builds pass --require-pyc (see compilers.py).
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import argparse
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import archive  # noqa: E402
import compilers  # noqa: E402
import fileio  # noqa: E402
import layout  # noqa: E402

SINGLE_DIR = 'single'


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description='Build the Three Marks .mtmod / .wotmod packages')
    parser.add_argument('--single', action='store_true', help='one package with everything (the pre-split format)')
    parser.add_argument(
        '--wg',
        action='store_true',
        help='write .wotmod for WG clients instead of .mtmod for Lesta',
    )
    parser.add_argument(
        '--require-pyc',
        action='store_true',
        help='fail when no compiler is available (release builds)',
    )
    parser.add_argument(
        '--compiler',
        choices=('auto', 'owg', 'py27'),
        default='auto',
        help='bytecode compiler backend',
    )
    parser.add_argument('--owg-compiler', help='path to owg_python_compiler')
    parser.add_argument('--python27', help='path to a Python 2.7 interpreter')
    parser.add_argument(
        '--out',
        default=os.path.join(layout.MODPACK_DIR, 'dist'),
        help='output directory (--single writes into its single/)',
    )
    parser.add_argument('--install-dir', help='also copy the packages here, e.g. <game>/mods/<client version>')
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='list the packages and their in-game paths, write nothing',
    )
    return parser.parse_args(argv)


def output_dir(args):
    return os.path.join(args.out, SINGLE_DIR) if args.single else args.out


def platform_of(args):
    return 'wg' if args.wg else 'lesta'


def print_packages(packages, args):
    for package in packages:
        package_file = archive.file_name(package, platform_of(args), single=args.single)
        print('%s  %s (%d files)' % (package_file, package.package_id, len(package.files)))
        for _, archive_path in sorted(package.files, key=lambda item: item[1]):
            print('    ' + archive_path)


def select_compiler(args):
    """The compile function of the chosen backend, or None: then the packages carry .py sources."""
    _, compile_entries = compilers.select(args.compiler, args.owg_compiler, args.python27)
    if compile_entries is not None:
        return compile_entries
    if args.require_pyc:
        raise SystemExit(
            'no Python 2.7 bytecode compiler found (owg_python_compiler or Python 2.7); release builds need .pyc',
        )
    print('WARNING: no compiler found, packaging .py sources (development client only)')
    return None


def package_entries(package, compile_entries, staging):
    """(source path, archive path) of what goes into the archive: sources compiled when a compiler is set."""
    sources = [item for item in package.files if item[1].endswith('.py')]
    assets = [item for item in package.files if not item[1].endswith('.py')]
    if compile_entries is None or not sources:
        return sources + assets
    return compile_entries(sources, staging) + assets


def write_packages(packages, args, staging):
    compile_entries = select_compiler(args)
    out_dir = output_dir(args)
    fileio.make_dirs(out_dir)

    outputs = []
    for index, package in enumerate(packages):
        entries = package_entries(package, compile_entries, os.path.join(staging, 'pkg%d' % index))
        output = os.path.join(out_dir, archive.file_name(package, platform_of(args), single=args.single))
        archive.write_package(output, entries, archive.meta_xml(package))
        print('Built %s (%d files)' % (output, len(entries)))
        outputs.append(output)
    return outputs


def install(outputs, install_dir):
    fileio.make_dirs(install_dir)
    for output in outputs:
        shutil.copy2(output, install_dir)
    print('Copied %d package(s) to %s' % (len(outputs), install_dir))


def build(args):
    staging = tempfile.mkdtemp(prefix='otmetki-build-')
    try:
        root_init = fileio.write_text(os.path.join(staging, 'root_init.py'), layout.ROOT_INIT)
        packages = [layout.single_package(root_init)] if args.single else layout.split_packages(root_init)
        if args.dry_run:
            print_packages(packages, args)
            return []

        outputs = write_packages(packages, args, staging)
        if args.install_dir:
            install(outputs, args.install_dir)
        return outputs
    finally:
        shutil.rmtree(staging, ignore_errors=True)


def main(argv=None):
    build(parse_args(argv))


if __name__ == '__main__':
    main()

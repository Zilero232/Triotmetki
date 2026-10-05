"""Builds the chosen packages with tools/build, the way `build.py` does without --require-pyc.

Bytecode when owg_python_compiler or a Python 2.7 is found (tools/build/compilers.py), `.py` sources otherwise. The
production client loads only `mod_*.pyc`, so a source build only loads in a development client: the warning says so.
"""
import os
import shutil
import tempfile

import archive
import build
import compilers
import fileio
import layout

SOURCES_WARNING = (
    'WARNING: no Python 2.7 bytecode compiler found (owg_python_compiler or Python 2.7, see tools/build/compilers.py):'
    ' the packages carry .py sources and the production client loads only mod_*.pyc'
)


def package_file_name(package, platform='lesta'):
    """The built file's name: <package id>_<version>.mtmod (.wotmod for WG)."""
    return archive.file_name(package, platform)


class Builder(object):
    """Picks the compiler once, then builds any subset of the packages into `out_dir`."""

    def __init__(self, out_dir, compiler='auto', platform='lesta'):
        self.out_dir = out_dir
        self.platform = platform
        _, self.compile_entries = compilers.select(compiler)
        if self.compile_entries is None:
            print(SOURCES_WARNING)

    def packages(self, staging):
        """Every package of the split layout (fresh from the sources), its otmetki/__init__.py written to staging."""
        root_init = fileio.write_text(os.path.join(staging, 'root_init.py'), layout.ROOT_INIT)
        return layout.split_packages(root_init)

    def build(self, keys):
        """{key: built package path} for `keys`, in the build's order."""
        os.makedirs(self.out_dir, exist_ok=True)
        staging = tempfile.mkdtemp(prefix='otmetki-dev-')
        try:
            built = {}
            for index, package in enumerate(item for item in self.packages(staging) if item.key in keys):
                entries = build.package_entries(package, self.compile_entries, os.path.join(staging, 'pkg%d' % index))
                output = os.path.join(self.out_dir, package_file_name(package, self.platform))
                archive.write_package(output, entries, archive.meta_xml(package))
                built[package.key] = output
            return built
        finally:
            shutil.rmtree(staging, ignore_errors=True)

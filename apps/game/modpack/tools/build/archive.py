"""Package writer: a stored (uncompressed) zip with explicit directory entries and meta.xml.

Lesta clients from 1.35 load `.mtmod` packages from mods/<client version>/; WG clients load `.wotmod`.
The format is the same, only the extension differs.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import zipfile
from xml.sax.saxutils import escape

import fileio

ZIP_DATE = (2020, 1, 1, 0, 0, 0)
ZIP_EPOCH = 1577836800  # ZIP_DATE as a Unix timestamp, for reproducible .pyc headers
EXTENSIONS = {'lesta': 'mtmod', 'wg': 'wotmod'}


def meta_xml(package):
    """meta.xml. Dependencies are listed for installers and people; whether the client reads them is
    unverified, and the code never relies on load order (see packages/core/registry.py)."""
    lines = [
        '<root>',
        '    <id>%s</id>' % escape(package.package_id),
        '    <version>%s</version>' % escape(package.version),
        '    <name>%s</name>' % escape(package.name),
        '    <description>%s</description>' % escape(package.description),
    ]
    if package.depends:
        lines.append('    <dependencies>')
        for dependency in package.depends:
            lines.append('        <dependency>')
            lines.append('            <id>%s</id>' % escape(dependency.package_id))
            lines.append('            <version>%s</version>' % escape(dependency.version))
            lines.append('        </dependency>')
        lines.append('    </dependencies>')
    lines.append('</root>')
    return '\n'.join(lines) + '\n'


def file_name(package, platform, single=False):
    extension = EXTENSIONS[platform]
    if single:
        return 'otmetki.%s.%s' % (package.version, extension)
    return '%s_%s.%s' % (package.package_id, package.version, extension)


def _parent_dirs(archive_path):
    """'a/b/c.py' -> ['a/', 'a/b/']: the directory entries a file needs above it."""
    parts = archive_path.split('/')[:-1]
    return ['/'.join(parts[:index]) + '/' for index in range(1, len(parts) + 1)]


def _file_info(archive_path):
    info = zipfile.ZipInfo(archive_path, ZIP_DATE)
    info.external_attr = 0o644 << 16
    return info


def _dir_info(directory):
    info = zipfile.ZipInfo(directory, ZIP_DATE)
    info.external_attr = (0o40755 << 16) | 0x10
    return info


def _members(entries):
    """(zip info, source path or None for a directory) in archive-path order, each directory before its files."""
    written = set()
    for source, archive_path in sorted(entries, key=lambda item: item[1]):
        for directory in _parent_dirs(archive_path):
            if directory not in written:
                written.add(directory)
                yield _dir_info(directory), None
        yield _file_info(archive_path), source


def write_package(path, entries, meta):
    """entries: (source path, archive path). Written in archive-path order with every parent directory."""
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_STORED) as package:
        package.writestr(_file_info('meta.xml'), meta.encode('utf-8'))
        for info, source in _members(entries):
            package.writestr(info, b'' if source is None else fileio.read_bytes(source))

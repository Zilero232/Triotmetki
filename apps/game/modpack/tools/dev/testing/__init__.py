"""Test helpers: fake game clients and a fake Lesta Game Center, laid out like the manager's detect/fixtures.rs."""
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import os
import sys

TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

import dev  # noqa: E402,F401  (puts tools/build on sys.path)
import fileio  # noqa: E402

PATHS_XML = (
    '<root>\n\t<Paths>\n\t\t<Path>./res_mods/{version}</Path>\n\t\t<Packages>\n\t\t\t<Root>./mods/{version}</Root>\n'
    '\t\t\t<Mask>*.mtmod</Mask>\n\t\t</Packages>\n\t\t<Path>./res</Path>\n\t</Paths>\n</root>\n'
)
CLIENT_145_PATHS_XML = (
    '<root>\n  <Paths>\n    <Path cacheSubdirs="true">./res_mods/{version}</Path>\n'
    '    <Path mask="*.mtmod" mode="recursive" root="res">./mods/{version}</Path>\n    <Packages>\n'
    '      <Package type="sd,hd">./res/packages/shared_content-part1.pkg</Package>\n    </Packages>\n'
    '  </Paths>\n</root>\n'
)


def write(path, text, encoding='utf-8'):
    if isinstance(text, bytes):
        text = text.decode('utf-8')
    fileio.make_dirs(os.path.dirname(path))
    with io.open(path, 'w', encoding=encoding, newline='') as handle:
        handle.write(text)
    return path


def write_version_xml(folder, version, realm):
    text = '<version.xml>\n\t<version>\tv.%s #8259\t</version>\n\t<meta>\n\t\t<realm>\t%s\t</realm>\n\t</meta>\n' \
           '</version.xml>\n' % (version, realm)
    return write(os.path.join(folder, 'version.xml'), text)


def lesta_client(root, name, version='1.45.0.0', paths_xml=PATHS_XML):
    """A Lesta client folder: version.xml (realm RU), paths.xml, Tanki.exe and mods/<version>/."""
    folder = os.path.join(root, name)
    write_version_xml(folder, version, 'RU')
    write(os.path.join(folder, 'paths.xml'), paths_xml.format(version=version))
    write(os.path.join(folder, 'Tanki.exe'), '')
    fileio.make_dirs(os.path.join(folder, 'mods', version))
    return folder


def write_lgc(program_data, lgc, clients, selected=None):
    """lgc_path.dat under program_data pointing at `lgc`, whose preferences.xml lists `clients`."""
    games = ''.join('<game><working_dir>%s</working_dir></game>' % path for path in clients)
    chosen = '<selectedGames><WOT>%s</WOT></selectedGames>' % selected if selected else ''
    write(os.path.join(program_data, 'Lesta', 'GameCenter', 'data', 'lgc_path.dat'), lgc)
    fileio.make_dirs(lgc)
    preferences = '<?xml version="1.0" encoding="UTF-8"?>\n<protocol name="lgc_preferences"><application>' \
                  '<games_manager><games>%s</games>%s</games_manager></application></protocol>\n' % (games, chosen)
    write(os.path.join(lgc, 'preferences.xml'), preferences)

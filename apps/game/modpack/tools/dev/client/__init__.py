"""Finds the local «Мир танков» client: a port of the manager's detection (apps/game/manager/tauri/src/detect).

OTMETKI_GAME_DIR names the client folder and wins. Otherwise the clients come from Lesta Game Center
(%ProgramData%\\Lesta\\GameCenter\\data\\lgc_path.dat -> its preferences.xml, every <working_dir>) plus the
manager's own manualClients, and the pick is the manager's: its selectedClient, then the client LGC has selected,
then the first usable one. The mods folder is <Packages><Root> of paths.xml when it stays inside the client, else
mods/<version> from version.xml, exactly as the manager lays packages out.
"""
import json
import os
import xml.etree.ElementTree as ElementTree
from dataclasses import dataclass, replace
from typing import Optional, Tuple

GAME_DIR_ENV = 'OTMETKI_GAME_DIR'
PROGRAM_DATA_ENV = 'PROGRAMDATA'
PROGRAM_DATA_FALLBACK = 'C:\\ProgramData'
ROAMING_ROOT_ENV = 'OTMETKI_ROAMING_ROOT'
APP_FOLDER = 'TriOtmetki'
VERSION_XML = 'version.xml'
PATHS_XML = 'paths.xml'
GAME_INFO_XML = 'game_info.xml'
LESTA_EXECUTABLE = 'Tanki.exe'
LESTA_REALMS = ('RU', 'RPT')
COMMON_TEST_MARK = '.RPT.'
DEFAULT_PACKAGE_MASK = '*.mtmod'
LGC_PATH_DAT = ('Lesta', 'GameCenter', 'data', 'lgc_path.dat')
PREFERENCES_XML = 'preferences.xml'
MIN_SUPPORTED = (1, 35, 0, 0)
UTF8_BOM = b'\xef\xbb\xbf'
UTF16_BOMS = (b'\xff\xfe', b'\xfe\xff')


class ClientError(RuntimeError):
    """No usable game client: the message says what to do."""


@dataclass(frozen=True)
class GameClient:
    path: str
    version: Tuple[int, int, int, int]
    realm: Optional[str]
    mods_dir: str
    res_mods_dir: str
    package_mask: str
    is_lesta: bool
    is_common_test: bool
    source: str
    preferred: bool = False

    @property
    def version_text(self):
        return '.'.join(str(part) for part in self.version)

    @property
    def problem(self):
        """None for a client the modpack supports; 'not_lesta' or 'old_version' otherwise (the manager's rule)."""
        if not self.is_lesta:
            return 'not_lesta'
        if not is_supported(self.version):
            return 'old_version'
        return None


def decode_text(data):
    """Bytes of a client or LGC file as text: a UTF-8 or UTF-16 BOM decides, plain UTF-8 otherwise."""
    if data.startswith(UTF8_BOM):
        return data[len(UTF8_BOM):].decode('utf-8', 'replace')
    if data.startswith(UTF16_BOMS):
        return data.decode('utf-16', 'replace')
    return data.decode('utf-8', 'replace')


def read_text(path):
    try:
        with open(path, 'rb') as handle:
            return decode_text(handle.read())
    except OSError:
        return None


def _document(text):
    if text is None:
        return None
    try:
        return ElementTree.fromstring(text.lstrip('\ufeff'))
    except ElementTree.ParseError:
        return None


def _stripped(text):
    value = (text or '').strip()
    return value or None


def _element_text(document, tag):
    return next((value for value in (_stripped(node.text) for node in document.iter(tag)) if value), None)


def parse_version(text):
    """'v.1.45.0.0 #8259' -> (1, 45, 0, 0); None when it is not 2 to 4 dot-separated numbers."""
    body = text.strip()
    if body.startswith('v.'):
        body = body[2:]
    token = body.replace('#', ' ').split()
    if not token:
        return None
    parts = token[0].split('.')
    if not 2 <= len(parts) <= 4 or not all(part.isdigit() for part in parts):
        return None
    numbers = [int(part) for part in parts] + [0] * (4 - len(parts))
    return tuple(numbers)


def is_supported(version):
    return version[0] == MIN_SUPPORTED[0] and version >= MIN_SUPPORTED


def parse_version_xml(text):
    """(version, realm) from version.xml, or None."""
    document = _document(text)
    version_text = _element_text(document, 'version') if document is not None else None
    version = parse_version(version_text) if version_text else None
    if version is None:
        return None
    return version, _element_text(document, 'realm')


def parse_paths_xml(text):
    """{'mods', 'res_mods', 'mask'}: the <Packages> root and mask, the first <Path> holding res_mods (or None each)."""
    document = _document(text)
    if document is None:
        return {'mods': None, 'res_mods': None, 'mask': None}
    packages = next(document.iter('Packages'), None)

    def child_text(tag):
        child = packages.find(tag) if packages is not None else None
        return _stripped(child.text) if child is not None else None

    res_mods = next((value for value in (_stripped(node.text) for node in document.iter('Path'))
                     if value and 'res_mods' in value), None)
    return {'mods': child_text('Root'), 'res_mods': res_mods, 'mask': child_text('Mask')}


def parse_game_id(text):
    document = _document(text)
    return _element_text(document, 'id') if document is not None else None


def join_relative(root, relative):
    """root joined with a paths.xml folder, or None when that folder would leave the client (.., a drive)."""
    parts = [part for part in relative.replace('\\', '/').split('/') if part and part != '.']
    if any(part == '..' or ':' in part for part in parts):
        return None
    return os.path.join(root, *parts)


def _game_folder(path, relative, name, version_text):
    joined = join_relative(path, relative) if relative else None
    return joined or os.path.join(path, name, version_text)


def inspect(path, source):
    """The GameClient in `path`, or None when it has no readable version.xml."""
    parsed = parse_version_xml(read_text(os.path.join(path, VERSION_XML)))
    if parsed is None:
        return None
    version, realm = parsed
    paths = parse_paths_xml(read_text(os.path.join(path, PATHS_XML)))
    game_id = parse_game_id(read_text(os.path.join(path, GAME_INFO_XML)))
    version_text = '.'.join(str(part) for part in version)
    is_lesta = realm in LESTA_REALMS or os.path.isfile(os.path.join(path, LESTA_EXECUTABLE))
    is_common_test = realm == LESTA_REALMS[1] or COMMON_TEST_MARK in (game_id or '')
    return GameClient(
        path=path,
        version=version,
        realm=realm,
        mods_dir=_game_folder(path, paths['mods'], 'mods', version_text),
        res_mods_dir=_game_folder(path, paths['res_mods'], 'res_mods', version_text),
        package_mask=paths['mask'] or DEFAULT_PACKAGE_MASK,
        is_lesta=is_lesta,
        is_common_test=is_common_test,
        source=source,
    )


def normalized(path):
    """The manager's path key: backslashes, no trailing separator, lower case."""
    text = str(path).replace('/', '\\')
    if len(text) > 3:
        text = text.rstrip('\\')
    return text.lower()


def same_path(left, right):
    return normalized(left) == normalized(right)


def lgc_dir(program_data):
    """The Lesta Game Center folder lgc_path.dat names (its exe's folder when it names the exe), or None."""
    text = read_text(os.path.join(program_data, *LGC_PATH_DAT))
    line = next((line.strip() for line in (text or '').splitlines() if line.strip()), None)
    if line is None:
        return None
    path = line.strip('\0')
    if path.lower().endswith('.exe'):
        path = os.path.dirname(path)
    return path if os.path.isdir(path) else None


def parse_preferences(text):
    """(every <working_dir>, the first path under <selectedGames> or None) from LGC's preferences.xml."""
    document = _document(text)
    if document is None:
        return [], None
    clients = [value for value in (_stripped(node.text) for node in document.iter('working_dir')) if value]
    selected_games = next(document.iter('selectedGames'), None)
    selected = None
    if selected_games is not None:
        selected = next((value for value in (_stripped(child.text) for child in selected_games) if value), None)
    return clients, selected


def manager_settings(roaming_root):
    """(selectedClient, manualClients) from the manager's settings.json; (None, []) without one."""
    text = read_text(os.path.join(roaming_root, 'manager', 'settings.json'))
    try:
        settings = json.loads(text) if text else {}
    except ValueError:
        settings = {}
    return settings.get('selectedClient'), list(settings.get('manualClients') or [])


def detect_clients(program_data, manual=()):
    """Every client LGC knows and every manual one, once each, the one LGC has selected marked preferred."""
    lgc = lgc_dir(program_data)
    clients_in_lgc, selected = parse_preferences(read_text(os.path.join(lgc, PREFERENCES_XML))) if lgc else ([], None)
    candidates = [(path, 'lgc') for path in clients_in_lgc] + [(path, 'manual') for path in manual]
    found = []
    for path, source in candidates:
        if any(same_path(client.path, path) for client in found):
            continue
        client = inspect(path, source)
        if client is not None:
            preferred = selected is not None and same_path(selected, path)
            found.append(replace(client, preferred=preferred))
    return found


def default_client(clients, selected=None):
    """The manager's pick: the selected path, then the preferred usable client, then the first usable one."""
    usable = [client for client in clients if client.problem is None]
    by_selection = next((client for client in clients if selected and same_path(client.path, selected)), None)
    preferred = next((client for client in usable if client.preferred), None)
    return by_selection or preferred or (usable[0] if usable else None)


def roaming_root(environ):
    if environ.get(ROAMING_ROOT_ENV):
        return environ[ROAMING_ROOT_ENV]
    return os.path.join(environ.get('APPDATA', ''), APP_FOLDER)


def find_client(environ):
    """The client to work on: OTMETKI_GAME_DIR, else the manager's rules. Raises ClientError when there is none."""
    explicit = environ.get(GAME_DIR_ENV)
    if explicit:
        client = inspect(explicit, 'env')
        if client is None:
            raise ClientError('%s=%s has no readable version.xml: not a game client folder' % (GAME_DIR_ENV, explicit))
        return client
    selected, manual = manager_settings(roaming_root(environ))
    program_data = environ.get(PROGRAM_DATA_ENV) or environ.get('ProgramData') or PROGRAM_DATA_FALLBACK
    client = default_client(detect_clients(program_data, manual), selected)
    if client is None:
        raise ClientError('no «Мир танков» client found through Lesta Game Center; set %s to the client folder'
                          % GAME_DIR_ENV)
    return client

from __future__ import absolute_import, division, print_function, unicode_literals

from ....core.compat import clean_text, string_types, to_text
from .constants import (  # noqa: F401
    ACTION_CHECK,
    ACTION_OPEN,
    ACTION_SKIP,
    DOWNLOAD_PATH,
    GAME_FOLDER,
    LATEST_PATH,
    MAX_VERSION,
    RELEASE_VERSION,
    SINGLE_FILE,
    SINGLE_ID,
    SPLIT_FILE,
    STATUS_COMPATIBLE,
    VERSION_NUMBERS,
)

# Nothing about the player leaves the client: the request names only the game version, the answer is the public
# release index the site and the manager read.


# Trailing zeros are dropped so versions of different lengths compare as the numbers they are: 1.2 == 1.2.0.
def version_key(text):
    if not isinstance(text, string_types):
        return None
    found = VERSION_NUMBERS.match(to_text(text))
    if not found:
        return None
    parts = [int(part) for part in found.group(0).split('.')]
    while parts and parts[-1] == 0:
        parts.pop()
    return tuple(parts)


def package_of(file_name):
    """(package id, version) of one of our package files, or None."""
    if not isinstance(file_name, string_types):
        return None
    name = to_text(file_name)
    single = SINGLE_FILE.match(name)
    if single:
        return SINGLE_ID, single.group(1)
    split = SPLIT_FILE.match(name)
    return (split.group(1), split.group(2)) if split else None


def installed_packages(file_names):
    installed = {}
    for found in (package_of(name) for name in file_names or ()):
        if found is None:
            continue
        package_id, version = found
        known = installed.get(package_id)
        if known is None or version_key(version) > version_key(known):
            installed[package_id] = version
    return installed


def game_folder(names):
    """The newest mods/<client version> folder name: the one the running client loads."""
    folders = [to_text(name) for name in names or () if isinstance(name, string_types) and GAME_FOLDER.match(name)]
    return max(folders, key=version_key) if folders else None


def clean_release(data):
    if not isinstance(data, dict) or data.get('status') != STATUS_COMPATIBLE:
        return None
    release = data.get('release')
    if not isinstance(release, dict):
        return None
    version = clean_text(release.get('version'), MAX_VERSION, u'')
    if not RELEASE_VERSION.match(version):
        return None
    packages = [item for item in release.get('packages') or () if isinstance(item, dict)]
    return {
        'version': version,
        'files': [item.get('file') for item in packages],
    }


def outdated_count(release, installed):
    wanted = version_key(release['version'])
    if SINGLE_ID in installed:
        return 1 if version_key(installed[SINGLE_ID]) < wanted else 0
    count = 0
    for found in (package_of(name) for name in release['files']):
        if found is None or found[0] not in installed:
            continue
        if version_key(installed[found[0]]) < version_key(found[1]):
            count += 1
    return count


def find_update(release, installed):
    """{version, outdated} when the release has a newer copy of an installed package, else None."""
    if release is None or not installed:
        return None
    outdated = outdated_count(release, installed)
    if not outdated:
        return None
    return {'version': release['version'], 'outdated': outdated}


def is_shown(update, skipped):
    return update is not None and update['version'] != skipped

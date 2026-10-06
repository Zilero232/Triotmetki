"""The dev install in the client: mods/<version>/otmetki-dev/ and its manifest otmetki-dev.json.

The client loads packages from mods/<version>/ recursively (paths.xml `mode="recursive"`, docs/research/client), so a
subfolder works and keeps the dev packages apart from the user's mods and from the manager, which lists mods/<version>/
without descending. The manifest records every file the dev loop wrote with its sha256; uninstall removes exactly
those, leaves a file someone changed since (with a warning), and deletes the folder only when nothing else is left.
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import io
import datetime
import errno
import json
import os
import shutil

import attr
import fileio

DEV_FOLDER = 'otmetki-dev'
# A file the running client holds open fails with one of these.
ACCESS_ERRORS = (errno.EACCES, errno.EPERM)
MANIFEST_NAME = 'otmetki-dev.json'
MANIFEST_TOOL = 'otmetki-dev'
PARTIAL_SUFFIX = '.part'
RUNNING_HINT = 'is the game client running? It keeps its packages open: close it and run the command again'


class DeployError(RuntimeError):
    """A file could not be written or removed, or the manifest is not ours."""


@attr.s
class SyncPlan(object):
    copy = attr.ib(factory=list)
    remove = attr.ib(factory=list)
    keep = attr.ib(factory=list)
    changed = attr.ib(factory=list)

    @property
    def is_empty(self):
        return not self.copy and not self.remove


@attr.s
class UninstallPlan(object):
    remove = attr.ib(factory=list)
    changed = attr.ib(factory=list)
    missing = attr.ib(factory=list)


def dev_dir(mods_dir):
    return os.path.join(mods_dir, DEV_FOLDER)


def manifest_file(folder):
    return os.path.join(folder, MANIFEST_NAME)


def is_plain_name(name):
    """A bare file name inside the dev folder: no separators, no parent, not the manifest."""
    return bool(name) and name == os.path.basename(name) and '/' not in name and '\\' not in name \
        and name not in ('.', '..', MANIFEST_NAME)


def read_manifest(folder):
    """The manifest of the dev folder, or None. Raises DeployError for a manifest the dev loop did not write."""
    path = manifest_file(folder)
    if not os.path.isfile(path):
        return None
    try:
        with io.open(path, encoding='utf-8') as handle:
            manifest = json.load(handle)
    except ValueError as error:
        raise DeployError('%s is not valid JSON: %s' % (path, error))
    if not isinstance(manifest, dict) or manifest.get('tool') != MANIFEST_TOOL:
        raise DeployError('%s was not written by the dev loop; leaving the folder alone' % path)
    files = manifest.get('files')
    if not isinstance(files, dict) or not all(is_plain_name(name) for name in files):
        raise DeployError('%s lists files outside the dev folder; leaving the folder alone' % path)
    return manifest


def _installed_sha(folder, name):
    path = os.path.join(folder, name)
    return fileio.sha256(path) if os.path.isfile(path) else None


def plan_sync(folder, recorded, wanted):
    """What turns the folder into `wanted` ({file name: source path}); `recorded` is the manifest's {name: sha256}.

    A recorded file no longer wanted is removed only while it still has its recorded hash."""
    plan = SyncPlan()
    for name, source in sorted(wanted.items()):
        if _installed_sha(folder, name) == fileio.sha256(source):
            plan.keep.append(name)
        else:
            plan.copy.append((name, source))
    for name, sha in sorted(recorded.items()):
        if name in wanted:
            continue
        current = _installed_sha(folder, name)
        if current is None:
            continue
        if current == sha:
            plan.remove.append(name)
        else:
            plan.changed.append(name)
    return plan


def plan_uninstall(folder, recorded):
    plan = UninstallPlan()
    for name, sha in sorted(recorded.items()):
        current = _installed_sha(folder, name)
        if current is None:
            plan.missing.append(name)
        elif current == sha:
            plan.remove.append(name)
        else:
            plan.changed.append(name)
    return plan


def _write_copy(source, target):
    partial = target + PARTIAL_SUFFIX
    try:
        shutil.copyfile(source, partial)
        fileio.replace_file(partial, target)
    except (IOError, OSError) as error:
        if error.errno not in ACCESS_ERRORS:
            raise
        raise DeployError('cannot write %s: %s' % (target, RUNNING_HINT))
    finally:
        if os.path.exists(partial):
            os.remove(partial)


def _remove(path):
    try:
        os.remove(path)
    except OSError as error:
        if error.errno not in ACCESS_ERRORS:
            raise
        raise DeployError('cannot remove %s: %s' % (path, RUNNING_HINT))


def write_manifest(folder, files, details):
    manifest = dict(details)
    manifest.update({
        'tool': MANIFEST_TOOL,
        'updatedAt': datetime.datetime.now().replace(microsecond=0).isoformat(),
        'files': dict(sorted(files.items())),
    })
    fileio.write_json(manifest_file(folder), manifest)


def apply_sync(folder, plan, details):
    """Carries out the plan and rewrites the manifest: {name: sha256} of every file the dev loop now owns there."""
    fileio.make_dirs(folder)
    recorded = dict((read_manifest(folder) or {}).get('files', {}))
    for name in plan.remove:
        _remove(os.path.join(folder, name))
        recorded.pop(name, None)
    for name in plan.changed:
        recorded.pop(name, None)
    for name, source in plan.copy:
        _write_copy(source, os.path.join(folder, name))
        recorded[name] = fileio.sha256(source)
        write_manifest(folder, recorded, details)
    for name in plan.keep:
        recorded[name] = fileio.sha256(os.path.join(folder, name))
    write_manifest(folder, recorded, details)
    return recorded


def sync(folder, wanted, details):
    """plan_sync + apply_sync: (plan, {name: sha256})."""
    manifest = read_manifest(folder) or {}
    plan = plan_sync(folder, manifest.get('files', {}), wanted)
    return plan, apply_sync(folder, plan, details)


def uninstall(folder):
    """Removes what the manifest lists and still matches, then the manifest, then the folder if empty. None when
    there is no dev install."""
    manifest = read_manifest(folder)
    if manifest is None:
        return None
    plan = plan_uninstall(folder, manifest['files'])
    for name in plan.remove:
        _remove(os.path.join(folder, name))
    if plan.changed:
        write_manifest(folder, dict((name, manifest['files'][name]) for name in plan.changed), _details(manifest))
    else:
        _remove(manifest_file(folder))
    if not os.listdir(folder):
        os.rmdir(folder)
    return plan


def _details(manifest):
    return dict((key, value) for key, value in manifest.items() if key not in ('tool', 'updatedAt', 'files'))


def details_of(client, keys, third_party_ids):
    """What the manifest says besides its files: the client, the package keys and the third-party ids."""
    return {
        'client': client.path,
        'clientVersion': client.version_text,
        'packages': list(keys),
        'thirdParty': list(third_party_ids),
    }


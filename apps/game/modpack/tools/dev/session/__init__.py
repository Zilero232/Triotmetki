"""The dev loop's commands over one detected client: status, install, uninstall, watch, log."""
import os

import layout
from setupkit import ASSETS_DIR, CATALOG_PATH
from setupkit.manifest import catalog as catalog_module

from dev import builder, deploy, manager, pylog, selection, thirdparty, watch
from dev.client import ClientError, find_client

OWN_LOG = os.path.join('mods', 'configs', 'otmetki', 'otmetki.log')
MANAGER_REFUSAL = (
    'the modpack manager has installed the modpack in this client; two copies of one package break the client, so the'
    ' dev loop does not install next to it. Uninstall the modpack in the manager first (its own uninstall removes its'
    ' packages and its manifest), then run the dev install again.'
)


class ManagerInstallError(RuntimeError):
    """A manager install is in the client."""


DevError = (
    ClientError,
    ManagerInstallError,
    deploy.DeployError,
    thirdparty.ThirdPartyError,
    selection.SelectionError,
    catalog_module.CatalogError,
)


class Session(object):

    def __init__(self, environ, out_dir, cache_dir):
        self.environ = environ
        self.out_dir = out_dir
        self.cache_dir = cache_dir
        self.client = find_client(environ)
        self.catalog = catalog_module.load(CATALOG_PATH, ASSETS_DIR)
        self.dev_dir = deploy.dev_dir(self.client.mods_dir)

    def describe_client(self):
        client = self.client
        print('Game client: %s (%s, version %s, realm %s)' % (
            client.path, client.source, client.version_text, client.realm or '-'))
        print('Mods folder: %s' % client.mods_dir)
        if client.problem:
            print('WARNING: %s client: the modpack supports Lesta 1.35+ only' % client.problem)

    def manager_install(self):
        return manager.find_install(self.environ, self.client, self.catalog.owned_patterns)

    def refuse_next_to_manager(self):
        found = self.manager_install()
        if found.present:
            raise ManagerInstallError(MANAGER_REFUSAL + '\n' + found.describe())

    def refuse_unsupported(self):
        if self.client.problem:
            raise ClientError('%s is a %s client; the modpack supports Lesta 1.35+ only'
                              % (self.client.path, self.client.problem))

    def status(self, args):
        self.describe_client()
        found = self.manager_install()
        print('Manager install: %s' % ('yes\n' + found.describe() if found.present else 'none'))
        manifest = deploy.read_manifest(self.dev_dir)
        if manifest is None:
            print('Dev install: none')
            return
        files = manifest['files']
        print('Dev install: %s, %d files, updated %s' % (self.dev_dir, len(files), manifest.get('updatedAt')))
        for name in sorted(manifest['files']):
            print('    ' + name)

    def choose(self, ids):
        return selection.select(layout.split_packages('root_init.py'), self.catalog, ids)

    def third_party_files(self, chosen, offline, dry_run):
        """{file name: cached path} of the third-party packages to install; a player's own copy is left as it is."""
        wanted = {}
        for dependency in chosen.dependencies:
            copies = thirdparty.find_copies(self.client.mods_dir, dependency, skip_dir=self.dev_dir)
            if copies:
                print('%s: using the copy already in the client (%s)' % (dependency.id, copies[0]))
                continue
            cached = os.path.join(self.cache_dir, dependency.file)
            if dry_run:
                print('%s: %s %s' % (dependency.id, 'cached' if os.path.isfile(cached) else 'would download',
                                     dependency.file))
                wanted[dependency.file] = cached
                continue
            wanted[dependency.file] = thirdparty.fetch(dependency, self.cache_dir, offline=offline)
        return wanted

    def details(self, chosen):
        return deploy.details_of(self.client, chosen.keys, [dependency.id for dependency in chosen.dependencies])

    def prepare(self, args):
        self.describe_client()
        self.refuse_unsupported()
        self.refuse_next_to_manager()
        return self.choose(args.ids)

    def install(self, args):
        chosen = self.prepare(args)
        third_party = self.third_party_files(chosen, args.offline, args.dry_run)
        if args.dry_run:
            self.print_dry_run(chosen, third_party)
            return
        package_builder = builder.Builder(os.path.join(self.out_dir, 'packages'), compiler=args.compiler)
        built = package_builder.build(chosen.keys)
        self.sync(chosen, built, third_party)

    def print_dry_run(self, chosen, third_party):
        names = self.package_names(chosen.keys)
        recorded = (deploy.read_manifest(self.dev_dir) or {}).get('files', {})
        wanted = sorted(set(names.values()) | set(third_party))
        print('Dry run: would build %d package(s) and install into %s' % (len(names), self.dev_dir))
        for name in wanted:
            print('    + ' + name)
        for name in sorted(set(recorded) - set(wanted)):
            print('    - ' + name)

    def package_names(self, keys):
        packages = layout.split_packages('root_init.py')
        return dict((package.key, builder.package_file_name(package)) for package in packages if package.key in keys)

    def sync(self, chosen, built, third_party):
        wanted = dict((os.path.basename(path), path) for path in built.values())
        wanted.update(third_party)
        plan, files = deploy.sync(self.dev_dir, wanted, self.details(chosen))
        print('Installed into %s: %d written, %d unchanged, %d removed' % (
            self.dev_dir, len(plan.copy), len(plan.keep), len(plan.remove)))
        for name, _ in plan.copy:
            print('    + ' + name)
        for name in plan.remove:
            print('    - ' + name)
        for name in plan.changed:
            print('    ! %s was changed by hand; left in place and no longer tracked' % name)
        if not plan.is_empty:
            print(watch.RESTART_REMINDER)
        return files

    def uninstall(self, args):
        self.describe_client()
        manifest = deploy.read_manifest(self.dev_dir)
        if manifest is None:
            print('No dev install in %s' % self.dev_dir)
            return
        if args.dry_run:
            plan = deploy.plan_uninstall(self.dev_dir, manifest['files'])
            print('Dry run: would remove %d file(s) from %s' % (len(plan.remove), self.dev_dir))
            for name in plan.remove:
                print('    - ' + name)
            for name in plan.changed:
                print('    ! %s changed since the install; would be left' % name)
            return
        plan = deploy.uninstall(self.dev_dir)
        print('Removed %d file(s) from %s' % (len(plan.remove), self.dev_dir))
        for name in plan.changed:
            print('    ! %s changed since the install; left in place' % name)
        print(watch.RESTART_REMINDER)

    def watch(self, args):
        chosen = self.prepare(args)
        third_party = self.third_party_files(chosen, args.offline, dry_run=False)
        package_builder = builder.Builder(os.path.join(self.out_dir, 'packages'), compiler=args.compiler)
        built = package_builder.build(chosen.keys)
        self.sync(chosen, built, third_party)

        def reinstall(keys):
            print('Changed: %s' % ', '.join(keys))
            try:
                self.refuse_next_to_manager()
                built.update(package_builder.build(keys))
                self.sync(chosen, built, third_party)
            except (deploy.DeployError, ManagerInstallError) as error:
                print('Not installed yet: %s (retrying)' % error)
                return False
            except (SyntaxError, SystemExit, OSError) as error:
                print('Build failed: %s (waiting for the next change)' % error)
            return True

        watch.run(chosen.keys, reinstall)

    def log(self, args):
        path = os.path.join(self.client.path, OWN_LOG) if args.own else pylog.log_path(self.client)
        print('-- %s' % path)
        pylog.tail(path, keep_all=args.all or args.own, follow=not args.no_follow)

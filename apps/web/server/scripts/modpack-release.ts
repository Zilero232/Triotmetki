import { modpackManagerReleaseSchema, modpackReleaseIndexSchema, modpackReleaseSchema } from '@otmetki/schemas';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { isMissingFileError } from '../src/common/lib/errors/errors';
import { parseChangelog, releaseNotes } from '../src/modules/modpack-releases/lib/changelog/changelog';
import { buildRelease, catalogPackages, mergeReleaseIndex, releasePayload } from '../src/modules/modpack-releases/lib/release-build/release-build';
import { RELEASE_BUILD } from '../src/modules/modpack-releases/lib/release-build/release-build.constants';
import { modpackCatalogSchema } from '../src/modules/modpack-releases/lib/release-build/release-build.schemas';
import { releaseChanges } from '../src/modules/modpack-releases/lib/release-changes/release-changes';
import { parseReleaseIndex } from '../src/modules/modpack-releases/lib/release-index/release-index';
import { newestFirst } from '../src/modules/modpack-releases/lib/release-order/release-order';
import { releaseNeeds } from '../src/modules/modpack-releases/lib/release-source/release-source';
import { RELEASE_SOURCE } from '../src/modules/modpack-releases/lib/release-source/release-source.constants';
import {
  managerReleaseManifestSchema,
  modpackReleaseManifestSchema
} from '../src/modules/modpack-releases/lib/release-source/release-source.schemas';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    version: { type: 'string' },
    games: { type: 'string' },
    catalog: { type: 'string' },
    packages: { type: 'string' },
    'base-url': { type: 'string' },
    out: { type: 'string' },
    current: { type: 'string' },
    changelog: { type: 'string' },
    release: { type: 'string' },
    signature: { type: 'string' },
    'manager-version': { type: 'string' },
    'manager-url': { type: 'string' },
    'manager-signature': { type: 'string' },
    manifest: { type: 'string', default: RELEASE_SOURCE.manifestFile },
    'manager-manifest': { type: 'string', default: RELEASE_SOURCE.managerManifestFile }
  }
});

const required = (name: keyof typeof values): string => {
  const value = values[name]?.trim();

  if (!value) {
    console.error(`--${name} is required`);
    process.exit(1);
  }

  return value;
};

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

const readText = async (path: string) => (await readFile(path, 'utf8')).trim();

const readOptional = (path: string) =>
  readFile(path, 'utf8').catch((error: unknown) => {
    if (isMissingFileError(error)) {
      return '';
    }

    throw error;
  });

const unsignedReleaseSchema = modpackReleaseSchema.omit({ signature: true });

const readIndex = async (path: string) => parseReleaseIndex(await readOptional(path));

const readJson = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, 'utf8'));

const source = async () => {
  const {
    version,
    otmetki: { games }
  } = modpackReleaseManifestSchema.parse(await readJson(required('manifest')));

  const { version: managerVersion } = managerReleaseManifestSchema.parse(await readJson(required('manager-manifest')));
  const needs = releaseNeeds({ index: await readIndex(required('current')), modpackVersion: version, managerVersion });

  console.log(`version=${version}`);
  console.log(`games=${games.join(',')}`);
  console.log(`manager_version=${managerVersion}`);
  console.log(`modpack_needed=${needs.modpack}`);
  console.log(`manager_needed=${needs.manager}`);
};

const readChangelog = async () => parseChangelog(values.changelog ? await readFile(values.changelog, 'utf8') : '');

const previousPackages = async (version: string) => {
  if (!values.current) {
    return null;
  }

  const [newest] = newestFirst((await readIndex(values.current)).releases.filter((release) => release.version !== version));

  return newest?.packages ?? null;
};

const prepare = async () => {
  const version = required('version');
  const out = required('out');
  const catalogBytes = await readFile(required('catalog'));
  const catalog = modpackCatalogSchema.parse(JSON.parse(catalogBytes.toString('utf8')));

  const packages = await Promise.all(
    catalogPackages(catalog).map(async ({ id, file }) => {
      const bytes = await readFile(join(required('packages'), file));

      return { id, file, sha256: sha256(bytes), size: bytes.byteLength };
    })
  );

  const [entries, previous] = await Promise.all([readChangelog(), previousPackages(version)]);

  const built = buildRelease({
    version,
    games: required('games')
      .split(',')
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0),
    publishedAt: new Date().toISOString(),
    baseUrl: required('base-url').replace(/\/+$/u, ''),
    catalog,
    catalogSha256: sha256(catalogBytes),
    packages
  });

  const release = unsignedReleaseSchema.parse({
    ...built,
    notes: releaseNotes({ entries, version }),
    changes: releaseChanges({ packages, previous, entries })
  });

  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'release.json'), `${JSON.stringify(release, null, 2)}\n`);
  await writeFile(join(out, 'release.txt'), releasePayload(release));

  console.log(
    `✓ modpack ${release.version}: ${release.packages.length} packages, ${release.changes?.length ?? 0} changed, payload in ${join(out, 'release.txt')}`
  );
};

const signedRelease = async (path: string) => ({
  ...unsignedReleaseSchema.parse(JSON.parse(await readText(path))),
  signature: await readText(required('signature'))
});

const managerRelease = async (version: string) =>
  modpackManagerReleaseSchema.parse({
    version,
    publishedAt: new Date().toISOString(),
    notes: '',
    platforms: { [RELEASE_BUILD.managerPlatform]: { url: required('manager-url'), signature: await readText(required('manager-signature')) } }
  });

const index = async () => {
  const previous = await readIndex(required('current'));
  const release = values.release ? await signedRelease(values.release) : undefined;
  const manager = values['manager-version'] ? await managerRelease(values['manager-version']) : undefined;

  if (!release && !manager) {
    console.error('pass --release and/or --manager-version');
    process.exit(1);
  }

  const merged = modpackReleaseIndexSchema.parse(mergeReleaseIndex({ index: previous, release, manager }));

  await writeFile(required('out'), `${JSON.stringify(merged, null, 2)}\n`);

  console.log(`✓ release index: ${merged.releases.map((item) => item.version).join(', ')}; manager ${merged.manager?.version ?? 'none'}`);
};

const commands = { source, prepare, index };
const command = positionals[0];

if (command !== 'source' && command !== 'prepare' && command !== 'index') {
  console.error('Usage: bun scripts/modpack-release.ts source|prepare|index [options] (docs/ops/deploy.md §4)');
  process.exit(1);
}

await commands[command]();

import { modpackReleaseSchema } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { INDEX, release } from '../../release-index/_tests/fixtures';
import { buildRelease, catalogPackages, mergeReleaseIndex, releasePayload } from '../release-build';

const BASE_URL = 'https://triotmetki.ru/downloads/modpack/0.2.0';

const CATALOG = {
  modpackVersion: '0.2.0',
  components: [
    { id: 'core', file: 'net.triotmetki.core_0.2.0.mtmod' },
    { id: 'companion', file: 'otmetki.companion_0.2.0.mtmod' },
    { id: 'gameface', kind: 'dependency', file: 'net.openwg.gameface_1.2.2.mtmod' }
  ]
};

const PACKAGES = [
  { id: 'core', file: 'net.triotmetki.core_0.2.0.mtmod', sha256: 'A'.repeat(64), size: 10 },
  { id: 'companion', file: 'otmetki.companion_0.2.0.mtmod', sha256: 'b'.repeat(64), size: 20 }
];

const BUILD = {
  version: '0.2.0',
  games: ['1.46.*'],
  publishedAt: '2026-09-29T10:00:00.000Z',
  baseUrl: BASE_URL,
  catalog: CATALOG,
  catalogSha256: 'C'.repeat(64)
};

const MANAGER = {
  version: '0.3.0',
  publishedAt: '2026-09-29T10:00:00.000Z',
  notes: '',
  platforms: { 'windows-x86_64': { url: 'https://triotmetki.ru/downloads/manager/0.3.0/otmetki-manager_0.3.0_x64-setup.exe', signature: 'c2ln' } }
};

describe('catalogPackages', () => {
  it('keeps our packages and leaves the third-party runtime dependencies out', () => {
    expect(catalogPackages(CATALOG).map((component) => component.id)).toEqual(['core', 'companion']);
  });
});

describe('releasePayload', () => {
  it('writes the text the manager verifies: packages sorted by id, lowercase digests, LF line ends', () => {
    expect(releasePayload(buildRelease({ ...BUILD, packages: PACKAGES }))).toBe(
      [
        'otmetki-modpack-release/2',
        'version 0.2.0',
        'games 1.46.*',
        `catalog ${'c'.repeat(64)}`,
        'notes -',
        `package companion otmetki.companion_0.2.0.mtmod 20 ${'b'.repeat(64)}`,
        `package core net.triotmetki.core_0.2.0.mtmod 10 ${'a'.repeat(64)}`,
        ''
      ].join('\n')
    );
  });

  it('hashes each language of the notes, the same way the manager does', () => {
    expect(releasePayload({ ...release({ version: '0.1.0', games: ['1.46.*'] }), notes: { ru: 'Исправления', en: 'Fixes' } })).toContain(
      'notes bb81ae64d8eb1df65dc2457b00e11100de8223f9de01d6237eea5059edc8bacd 59e5965495d92feeab9a57f4fad73dd3169ca0e0752d6d1983c6b2fc006fc13e\n'
    );
  });

  it('marks a release without a catalogue with a dash and joins several game patterns with commas', () => {
    expect(releasePayload({ ...release({ version: '0.1.0', games: ['1.45.*', '1.46.*'] }), catalog: null })).toContain(
      'games 1.45.*,1.46.*\ncatalog -\n'
    );
  });
});

describe('buildRelease', () => {
  it('points every file at the versioned downloads folder and passes the release schema once signed', () => {
    const built = buildRelease({ ...BUILD, packages: PACKAGES });

    expect(built.catalog).toEqual({ url: `${BASE_URL}/catalog/components.json`, sha256: 'c'.repeat(64) });
    expect(built.packages[0]?.url).toBe(`${BASE_URL}/net.triotmetki.core_0.2.0.mtmod`);
    expect(modpackReleaseSchema.safeParse({ ...built, signature: 'c2ln' }).success).toBe(true);
  });

  it('refuses a catalogue built for another modpack version', () => {
    expect(() => buildRelease({ ...BUILD, catalog: { ...CATALOG, modpackVersion: '0.1.0' }, packages: PACKAGES })).toThrow('0.1.0');
  });
});

describe('mergeReleaseIndex', () => {
  it('adds a new release, keeps the older ones and lists the newest first', () => {
    const merged = mergeReleaseIndex({ index: INDEX, release: release({ version: '0.11.0', games: ['1.47.*'] }), manager: MANAGER });

    expect(merged.releases.map((item) => item.version)).toEqual(['0.11.0', '0.10.0', '0.2.0', '0.1.0']);
    expect(merged.manager).toEqual(MANAGER);
  });

  it('replaces a re-published version in place and keeps its first publication date', () => {
    const republished = { ...release({ version: '0.2.0', games: ['1.46.*'] }), publishedAt: '2026-10-01T00:00:00.000Z' };
    const merged = mergeReleaseIndex({ index: INDEX, release: republished, manager: MANAGER });

    expect(merged.releases).toHaveLength(3);
    expect(merged.releases.find((item) => item.version === '0.2.0')).toEqual({ ...republished, publishedAt: '2026-09-27T12:00:00.000Z' });
  });

  it('keeps the first publication date of a manager version built again', () => {
    const merged = mergeReleaseIndex({
      index: INDEX,
      release: release({ version: '0.10.0', games: ['1.46.*'] }),
      manager: { ...MANAGER, version: '0.2.0' }
    });

    expect(merged.manager?.publishedAt).toBe('2026-09-27T12:00:00.000Z');
  });

  it('keeps the published modpack releases on a manager-only release', () => {
    const merged = mergeReleaseIndex({ index: INDEX, manager: MANAGER });

    expect(merged.releases).toEqual(INDEX.releases);
    expect(merged.manager).toEqual(MANAGER);
  });

  it('keeps the published manager on a modpack-only release', () => {
    const merged = mergeReleaseIndex({ index: INDEX, release: release({ version: '0.11.0', games: ['1.47.*'] }) });

    expect(merged.releases.map((item) => item.version)).toEqual(['0.11.0', '0.10.0', '0.2.0', '0.1.0']);
    expect(merged.manager).toEqual(INDEX.manager);
  });

  it('refuses to merge nothing', () => {
    expect(() => mergeReleaseIndex({ index: INDEX })).toThrow('Nothing to merge');
  });
});

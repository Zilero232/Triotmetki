import type { ModpackRelease } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import { parseChangelog } from '../../changelog/changelog';
import { release } from '../../release-index/_tests/fixtures';
import { changedPackages, modpackChangelog, packageVersion, releaseChanges } from '../release-changes';

const pkg = (id: string, version: string) => ({ id, file: `net.triotmetki.${id}_${version}.mtmod` });

const withPackages = (version: string, packages: ReturnType<typeof pkg>[], extra: Partial<ModpackRelease> = {}): ModpackRelease => {
  const base = release({ version, games: ['1.45.*'] });
  const [template] = base.packages;

  return { ...base, ...extra, packages: packages.map((item) => ({ ...template!, ...item })) };
};

describe('packageVersion', () => {
  it('reads the version from a package file name', () => {
    expect(packageVersion('net.triotmetki.battle_clock_0.2.1.mtmod')).toBe('0.2.1');
    expect(packageVersion('net.triotmetki.core_1.0.0-beta.2.wotmod')).toBe('1.0.0-beta.2');
  });

  it('answers null for a file name without one', () => {
    expect(packageVersion('otmetki.mtmod')).toBeNull();
  });
});

describe('changedPackages', () => {
  it('keeps the packages whose file changed or that are new', () => {
    const packages = [pkg('core', '0.2.0'), pkg('ui', '0.1.0'), pkg('hit_log', '0.1.0')];
    const previous = [pkg('core', '0.1.0'), pkg('ui', '0.1.0')];

    expect(changedPackages({ packages, previous }).map((item) => item.id)).toEqual(['core', 'hit_log']);
  });

  it('keeps every package when there is no previous release', () => {
    expect(changedPackages({ packages: [pkg('core', '0.1.0')], previous: null })).toHaveLength(1);
  });
});

describe('releaseChanges', () => {
  const entries = parseChangelog(['## core 0.2.0', '### ru', 'Ядро.', '### en', 'Core.'].join('\n'));

  it('lists the changed packages with their version and changelog entry, or null notes without one', () => {
    const changes = releaseChanges({ packages: [pkg('core', '0.2.0'), pkg('ui', '0.2.0')], previous: [pkg('ui', '0.1.0')], entries });

    expect(changes).toEqual([
      { id: 'core', version: '0.2.0', notes: { ru: 'Ядро.', en: 'Core.' } },
      { id: 'ui', version: '0.2.0', notes: null }
    ]);
  });

  it('refuses a package whose file name carries no version', () => {
    expect(() => releaseChanges({ packages: [{ id: 'core', file: 'core.mtmod' }], previous: null, entries })).toThrow(/core/u);
  });
});

describe('modpackChangelog', () => {
  const oldest = withPackages('0.1.0', [pkg('core', '0.1.0'), pkg('ui', '0.1.0')]);
  const middle = withPackages('0.2.0', [pkg('core', '0.2.0'), pkg('ui', '0.1.0')]);
  const recorded = { id: 'ui', version: '0.3.0', notes: { ru: 'Интерфейс.', en: 'UI.' } };
  const newest = withPackages('0.3.0', [pkg('core', '0.2.0'), pkg('ui', '0.3.0')], { changes: [recorded], notes: { ru: 'Выпуск.', en: 'Release.' } });
  const index = { schemaVersion: 1 as const, releases: [oldest, newest, middle] };

  it('lists releases newest first and keeps the changes the index recorded', () => {
    const { releases } = modpackChangelog({ index, limit: 10 });

    expect(releases.map((item) => item.version)).toEqual(['0.3.0', '0.2.0', '0.1.0']);
    expect(releases[0]).toMatchObject({ notes: { ru: 'Выпуск.', en: 'Release.' }, changes: [recorded] });
  });

  it('derives the changes of a release without them from the next older release', () => {
    const { releases } = modpackChangelog({ index, limit: 10 });

    expect(releases[1]?.changes).toEqual([{ id: 'core', version: '0.2.0', notes: null }]);
    expect(releases[2]?.changes.map((item) => item.id)).toEqual(['core', 'ui']);
  });

  it('diffs the last listed release against the older one past the limit', () => {
    const { releases } = modpackChangelog({ index, limit: 2 });

    expect(releases).toHaveLength(2);
    expect(releases[1]?.changes.map((item) => item.id)).toEqual(['core']);
  });
});

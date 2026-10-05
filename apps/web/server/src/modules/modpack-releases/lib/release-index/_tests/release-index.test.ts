import { describe, expect, it } from 'vitest';

import { MODPACK_RELEASES_SOURCE } from '../../../config/modpack-releases.constants';
import { parseReleaseIndex } from '../release-index';
import { INDEX } from './fixtures';

describe('parseReleaseIndex', () => {
  it('reads a blank file as the empty index', () => {
    expect(parseReleaseIndex(' \n')).toEqual(MODPACK_RELEASES_SOURCE.emptyIndex);
  });

  it('parses a published index', () => {
    expect(parseReleaseIndex(JSON.stringify(INDEX))).toEqual(INDEX);
  });

  it('refuses an index that breaks the contract', () => {
    expect(() => parseReleaseIndex('{"schemaVersion": 1, "releases": [{"version": "latest"}]}')).toThrow();
  });
});

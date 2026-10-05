import { describe, expect, it } from 'vitest';

import { pageSample, rawPageSample } from '../../../_tests/fixtures';
import { parseReplaysPage } from '../parse-replays-page';

const withUnknownEnums = () => {
  const sample = pageSample();

  return { ...sample, upload: 'later', items: sample.items.map((item) => ({ ...item, type: 'mystery' })) };
};

describe(parseReplaysPage, () => {
  it('reads the page the Python model builds', () => {
    const page = parseReplaysPage(rawPageSample());

    expect(page?.items.map((item) => [item.map, item.tier, item.result, item.site?.state])).toEqual([
      ['05_prohorovka', 5, 'win', 'uploaded'],
      ['02_malinovka', 7, null, 'queued']
    ]);
  });

  it('turns an unknown upload state into the fallback instead of dropping the page', () => {
    const page = parseReplaysPage(withUnknownEnums());

    expect(page?.upload).toBe('missing');
  });

  it('turns an unknown battle type into the fallback instead of dropping the item', () => {
    const page = parseReplaysPage(withUnknownEnums());

    expect(page?.items.map((item) => item.type)).toEqual(['other', 'other']);
  });

  it('reuses an item it already parsed when the page around it changes', () => {
    const raw = pageSample();
    const first = parseReplaysPage(raw);

    const again = parseReplaysPage({ ...raw, status: 'indexing' });

    expect(again?.status).toBe('indexing');
    expect(again?.items[0]).toBe(first?.items[0]);
  });

  it('drops the page when one item does not parse', () => {
    const raw = pageSample();

    const page = parseReplaysPage({ ...raw, items: [...raw.items, { id: 'broken' }] });

    expect(page).toBeNull();
  });

  it('rejects another page kind', () => {
    expect(parseReplaysPage({ kind: 'list', empty: '', rows: [] })).toBeNull();
  });

  it('rejects a missing page', () => {
    expect(parseReplaysPage(null)).toBeNull();
  });
});
